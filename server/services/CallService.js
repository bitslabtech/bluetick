/**
 * WhatsApp voice calling (customer-initiated). Everything stateful lives in the `Calls` table, so a
 * server restart or a second instance never loses a ringing call: a sweep (not per-call timers)
 * handles the "ring everyone after N seconds" fallback and the no-answer timeout.
 *
 * Ringing rules:
 *   stage 1  the assigned member; or, for unassigned / brand-new callers, the owner + admins
 *   stage 2  after `fallbackAfterSec`, every workspace member who has a call device registered
 *   timeout  RING_TIMEOUT_SEC with no answer -> reject at Meta, mark missed, auto-message the caller
 */
const { Op } = require('sequelize');
const Call = require('../models/Call');
const Conversation = require('../models/Conversation');
const Settings = require('../models/Settings');
const User = require('../models/User');
const Template = require('../models/Template');
const ChatMessage = require('../models/ChatMessage');
const Addon = require('../models/Addon');
const UserAddon = require('../models/UserAddon');
const DeviceToken = require('../models/DeviceToken');
const meta = require('../utils/metaCalling');
const push = require('../utils/callPush');
const elig = require('../utils/callEligibility');

const RING_TIMEOUT_SEC = 40;     // Meta gives ~30-60 s; stay inside it
const CALL_KINDS = ['fcm', 'apns_voip'];

const log = (...a) => console.log('[CALL]', ...a);
const warn = (...a) => console.warn('[CALL]', ...a);

function emit(room, event, payload) {
    try { require('../socket').getIo().to(room).emit(event, payload); } catch { /* socket not up (tests) */ }
}

// ── status & entitlement ───────────────────────────────────────────────────────────────────────

/** Voice add-on entitlement. Looks up the add-on even if it is not yet on sale (isActive=false),
 *  so superadmins can include it in plans (Plan.includedAddons) before it is purchasable. */
async function hasVoiceAddon(ownerId) {
    const addon = await Addon.findOne({ where: { module_key: elig.VOICE_ADDON_KEY } });
    if (!addon) return false;
    const ua = await UserAddon.findOne({ where: { userId: ownerId, addonId: addon.id, status: 'active' } });
    return !!ua;
}

/**
 * The state the app shows. Order matters: the first failing check wins.
 * whatsapp_not_connected | addon_required | not_eligible | disabled | ready
 */
async function getCallStatus(ownerId) {
    const settings = await Settings.findOne({ where: { userId: ownerId } });
    const owner = await User.findByPk(ownerId, { attributes: ['id', 'metaTier'] });
    const callSettings = elig.resolveCallSettings(settings?.callSettings);
    const tier = elig.checkTier(owner?.metaTier);
    // Show the selected template's review state next to each automatic message.
    const messageTemplates = {};
    for (const key of ['missedCallMessage', 'closedMessage']) {
        const id = callSettings[key].templateId;
        const t = id ? await Template.findOne({ where: { id, userId: ownerId } }) : null;
        if (t) messageTemplates[key] = { id: t.id, name: t.name, content: t.content, status: t.status, usable: elig.templateUsable(t).ok, ...elig.templatePreview(t) };
    }
    const base = { callSettings, messageTemplates, messagingLimit: tier.limit, minimumLimit: elig.MIN_MESSAGING_LIMIT };

    if (!settings?.metaAccessToken || !settings?.metaPhoneNumberId) return { state: 'whatsapp_not_connected', ...base };
    if (!(await hasVoiceAddon(ownerId))) return { state: 'addon_required', ...base };
    if (!tier.eligible) return { state: 'not_eligible', ...base };
    if (!callSettings.enabled) return { state: 'disabled', ...base };
    return { state: 'ready', ...base };
}

// ── people & devices ───────────────────────────────────────────────────────────────────────────

async function workspaceUsers(ownerId) {
    return User.findAll({
        where: { [Op.or]: [{ id: ownerId }, { parentUserId: ownerId }] },
        attributes: ['id', 'name', 'teamRole', 'parentUserId'],
    });
}

async function callDevices(userIds) {
    if (!userIds.length) return [];
    return DeviceToken.findAll({ where: { userId: { [Op.in]: userIds }, kind: { [Op.in]: CALL_KINDS } } });
}

/** Stage-1 targets: user ids that actually have a call device. */
async function stageOneTargets(ownerId, conversation) {
    const users = await workspaceUsers(ownerId);
    const withDevices = new Set((await callDevices(users.map((u) => u.id))).map((d) => d.userId));

    if (conversation?.assignedTo && withDevices.has(conversation.assignedTo)) return [conversation.assignedTo];

    // Unassigned / brand new caller (or the assignee has no call device): owner + admins only.
    const staff = users.filter((u) => u.id === ownerId || u.teamRole === 'admin').map((u) => u.id);
    return staff.filter((id) => withDevices.has(id));
}

async function stageTwoTargets(ownerId, exclude = []) {
    const users = await workspaceUsers(ownerId);
    const withDevices = new Set((await callDevices(users.map((u) => u.id))).map((d) => d.userId));
    return users.map((u) => u.id).filter((id) => withDevices.has(id) && !exclude.includes(id));
}

// ── ringing ────────────────────────────────────────────────────────────────────────────────────

function incomingEvent(call) {
    return {
        eventId: require('crypto').randomUUID(),
        serverCallId: call.id,
        hasVideo: false,
        startedAt: new Date(call.startedAt).toISOString(),
        caller: {
            id: call.phoneNumber,
            displayName: call.contactName || `+${call.phoneNumber}`,
            phoneNumber: `+${call.phoneNumber}`,
        },
        metadata: { conversationId: call.conversationId || null },
    };
}

async function dropDead(deadTokens) {
    if (deadTokens.length) await DeviceToken.destroy({ where: { token: { [Op.in]: deadTokens } } });
}

/** Ring these users: native push to every call device + a socket event for open apps. */
async function ring(call, userIds) {
    if (!userIds.length) return;
    const devices = await callDevices(userIds);
    const event = incomingEvent(call);
    const dead = [];
    await Promise.all(devices.map(async (d) => {
        const r = await push.pushIncomingCall(d, event);
        if (r.dead) dead.push(d.token);
    }));
    await dropDead(dead);
    userIds.forEach((id) => emit(id, 'incoming_call', { callId: call.id, phoneNumber: call.phoneNumber, contactName: call.contactName }));
    log(`ringing ${call.id} stage ${call.ringStage} -> ${userIds.length} user(s), ${devices.length} device(s)`);
}

/** Stop ringing on every device that is not the one that answered / after the call ended. */
async function stopRinging(call, reason, exceptUserId = null) {
    const ids = (call.ringTargets || []).filter((id) => id !== exceptUserId);
    const devices = await callDevices(ids);
    await Promise.all(devices.map((d) => push.pushCallEnded(d, call.id, reason)));
    emit(`team_${call.userId}`, 'call_update', publicCall(call));
}

function publicCall(c) {
    return {
        id: c.id,
        conversationId: c.conversationId,
        phoneNumber: c.phoneNumber,
        contactName: c.contactName,
        direction: c.direction,
        status: c.status,
        endReason: c.endReason,
        answeredBy: c.answeredBy,
        answeredByName: c.answeredByName,
        startedAt: c.startedAt,
        answeredAt: c.answeredAt,
        endedAt: c.endedAt,
        durationSec: c.durationSec,
        autoMessage: c.autoMessage || null,
    };
}

/** Who the call rang, for the call detail screen: [{ id, name, declined }]. */
async function rangMembers(call) {
    // Whoever answered was rung, even if the call predates ring tracking and has no targets stored.
    const ids = Array.from(new Set([...(call.ringTargets || []), ...(call.answeredBy ? [call.answeredBy] : [])]));
    if (!ids.length) return [];
    const users = await User.findAll({ where: { id: { [Op.in]: ids } }, attributes: ['id', 'name'] });
    const names = new Map(users.map((u) => [u.id, u.name]));
    return ids.map((id) => ({ id, name: names.get(id) || 'Team member', declined: (call.declinedBy || []).includes(id) }));
}

// ── call event in the chat thread ───────────────────────────────────────────────────────────

const mmss = (sec) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;

/** One line for the thread, or null when the call should not show up in the chat. */
function callEventText(call) {
    switch (call.status) {
        case 'missed': return 'Missed voice call';
        case 'declined': return 'Voice call declined';
        case 'failed': return 'Voice call failed';
        case 'ended': return call.durationSec ? `Voice call · ${mmss(call.durationSec)}` : 'Voice call';
        case 'rejected':
            if (call.endReason === 'outside_hours') return 'Voice call outside business hours';
            if (call.endReason === 'no_devices') return 'Missed voice call';
            return null; // add-on / eligibility / switched off: not something the team needs to see in the chat
        default: return null;
    }
}

/**
 * Add the finished call to the conversation as a "call" event. It is stored as an INBOUND row with
 * source 'call' and no effect on unread counts, the 24 h window or usage (a call is not a message).
 * Idempotent: the Meta-style messageId is derived from the call id. Never throws.
 */
async function logCallEvent(call) {
    try {
        const body = callEventText(call);
        if (!body || !call.conversationId) return;
        const messageId = `call:${call.id}`;
        if (await ChatMessage.findOne({ where: { messageId } })) return;
        const timestamp = call.endedAt || new Date();
        const message = await ChatMessage.create({
            conversationId: call.conversationId,
            messageId,
            direction: 'INBOUND',
            type: 'call',
            body,
            status: 'read',
            source: 'call',
            timestamp,
            templateData: { call: { id: call.id, status: call.status, endReason: call.endReason || null, durationSec: call.durationSec || 0, answeredByName: call.answeredByName || null } },
        });
        const conversation = await Conversation.findByPk(call.conversationId);
        if (conversation) {
            conversation.lastMessage = body;
            conversation.lastMessageAt = timestamp;
            await conversation.save();
            emit(call.userId, 'new_message', { conversation, message });
        }
    } catch (e) {
        warn(`could not log call ${call.id} in the chat:`, e.message);
    }
}

// ── automatic WhatsApp message ─────────────────────────────────────────────────────────────────

/** First word of the caller's profile name, or "there" when we only have a number. */
function callerFirstName(call) {
    const n = String(call.contactName || '').trim();
    if (!n || /^\+?[\d\s()-]+$/.test(n)) return 'there';
    return n.split(/\s+/)[0];
}

/**
 * Send the configured automatic message and record what happened on the call.
 *  template mode: an approved template works any time (even outside the 24 h window); if it is
 *                 not usable (pending/rejected/deleted) we fall back to the text when the window is open.
 *  text mode:     only inside the customer's 24 h window, otherwise skipped (never sent).
 * Never throws: it must not break call handling.
 */
async function sendAutoMessage(call, settings, which) {
    const record = (o) => call.update({ autoMessage: { which, ...o } }).catch(() => {});
    try {
        const cfg = elig.resolveCallSettings(settings.callSettings)[which];
        if (!cfg?.enabled) return record({ outcome: 'skipped', reason: 'disabled' });

        const conv = call.conversationId ? await Conversation.findByPk(call.conversationId) : null;
        const windowOpen = elig.isWindowOpen(conv?.lastInboundMessageAt);

        let type = 'text';
        let payload = null;
        let summary = '';
        let mode = 'text';
        let fallbackReason = null;

        if (cfg.mode === 'template') {
            const t = cfg.templateId ? await Template.findOne({ where: { id: cfg.templateId, userId: call.userId } }) : null;
            const u = elig.templateUsable(t);
            if (u.ok) {
                const name = callerFirstName(call);
                type = 'template';
                mode = 'template';
                summary = String(t.content || '').replace(/\{\{\s*1\s*\}\}/g, name);
                payload = {
                    messaging_product: 'whatsapp', recipient_type: 'individual', to: call.phoneNumber, type: 'template',
                    template: {
                        name: t.name,
                        language: { code: t.language || 'en_US' },
                        ...(u.variables === 1 ? { components: [{ type: 'body', parameters: [{ type: 'text', text: name }] }] } : {}),
                    },
                };
            } else {
                fallbackReason = t ? `template_${String(t.status || 'unusable').toLowerCase()}` : 'template_missing';
            }
        }

        if (!payload) {
            if (!cfg.text) return record({ outcome: 'skipped', reason: fallbackReason || 'no_text' });
            if (!windowOpen) return record({ outcome: 'skipped', reason: fallbackReason ? `${fallbackReason}_window_closed` : 'window_closed' });
            summary = cfg.text;
            payload = { messaging_product: 'whatsapp', recipient_type: 'individual', to: call.phoneNumber, type: 'text', text: { preview_url: false, body: cfg.text } };
        }

        const { sendWhatsAppAndLog } = require('../utils/whatsappSender');
        await sendWhatsAppAndLog({
            userId: call.userId,
            metaPhoneNumberId: settings.metaPhoneNumberId,
            metaAccessToken: settings.metaAccessToken,
            toPhone: call.phoneNumber,
            type,
            payload,
            summaryBody: summary,
            source: 'call_followup',
            refs: { refType: 'call', refId: call.id },
        });
        await record({ outcome: 'sent', mode, ...(fallbackReason ? { reason: fallbackReason } : {}) });
    } catch (e) {
        const reason = e.response?.data?.error?.message || e.message;
        warn(`auto message (${which}) failed for ${call.id}:`, reason);
        await record({ outcome: 'failed', reason: String(reason).slice(0, 200) });
    }
}

// ── missed-call notification ───────────────────────────────────────────────────────────────────

/**
 * "Missed call" push for the owner, the admins and everyone who was rung. Best-effort.
 * A decline by a member does not notify that member (they know), but owner/admins still hear of it.
 */
async function notifyMissed(call, { silentFor = [] } = {}) {
    try {
        const users = await workspaceUsers(call.userId);
        const staff = users.filter((u) => u.id === call.userId || u.teamRole === 'admin').map((u) => u.id);
        const ids = Array.from(new Set([...staff, ...(call.ringTargets || [])])).filter((id) => !silentFor.includes(id));
        if (!ids.length) return;
        const who = call.contactName || `+${call.phoneNumber}`;
        const body = call.endReason === 'outside_hours' ? `${who} called outside business hours` : `${who} tried to call you`;
        await require('../utils/pushNotifications').pushToWorkspace(call.userId, {
            userIds: ids,
            title: 'Missed call',
            body,
            data: { type: 'missed_call', callId: call.id, conversationId: call.conversationId || null },
        });
    } catch (e) {
        warn(`missed-call notification failed for ${call.id}:`, e.message);
    }
}

// ── lifecycle ──────────────────────────────────────────────────────────────────────────────────

async function finish(call, status, endReason, { settings, notifyCaller = false, autoMessage = null, rejectAtMeta = false } = {}) {
    // Only the first finisher wins (webhook terminate, sweep and decline can race).
    const [n] = await Call.update(
        { status, endReason, endedAt: new Date() },
        { where: { id: call.id, status: 'ringing' } },
    );
    if (!n) return false;
    await call.reload();
    if (rejectAtMeta && settings) await meta.rejectCall(settings, call.metaCallId).catch((e) => warn(`reject failed ${call.id}:`, e.response?.data?.error?.message || e.message));
    await stopRinging(call, status === 'missed' ? 'unanswered' : 'remoteEnded');
    if (autoMessage && settings) await sendAutoMessage(call, settings, autoMessage);
    await logCallEvent(call);
    if (status === 'missed' || status === 'declined') await notifyMissed(call, { silentFor: status === 'declined' ? (call.declinedBy || []) : [] });
    if (autoMessage) emit(`team_${call.userId}`, 'call_update', publicCall(call));
    return true;
}

/** `calls` webhook: one entry per call event. */
async function handleCallsWebhook({ ownerId, settings, value }) {
    const contactName = value?.contacts?.[0]?.profile?.name || null;
    for (const c of value?.calls || []) {
        try {
            if (c.event === 'connect') await handleIncoming({ ownerId, settings, call: c, contactName });
            else if (c.event === 'terminate') await handleTerminate({ settings, call: c });
        } catch (e) {
            console.error('[CALL] webhook handling failed:', e.message);
        }
    }
}

async function handleIncoming({ ownerId, settings, call: c, contactName }) {
    if (c.direction && c.direction !== 'USER_INITIATED') return; // Phase 1 never places calls
    if (await Call.findOne({ where: { metaCallId: c.id } })) return; // Meta retries webhooks

    const phone = String(c.from || '').replace(/\D/g, '');
    const sdp = c.session?.sdp || c.connection?.webrtc?.sdp || null;

    let conv = await Conversation.findOne({ where: { phoneNumber: phone, userId: ownerId } });
    if (!conv) {
        conv = await Conversation.create({ userId: ownerId, phoneNumber: phone, contactName: contactName || phone, status: 'open', unreadCount: 0 });
    }

    const record = (status, endReason) => Call.create({
        userId: ownerId, conversationId: conv.id, metaCallId: c.id, phoneNumber: phone,
        contactName: conv.contactName || contactName, status, endReason, sdpOffer: sdp,
        endedAt: status === 'ringing' ? null : new Date(),
    });

    const refuse = async (endReason, autoMessage) => {
        const row = await record('rejected', endReason);
        await meta.rejectCall(settings, c.id).catch((e) => warn(`reject failed ${c.id}:`, e.response?.data?.error?.message || e.message));
        if (autoMessage) await sendAutoMessage(row, settings, autoMessage);
        await logCallEvent(row);
        if (endReason === 'outside_hours' || endReason === 'no_devices') await notifyMissed(row);
        emit(`team_${ownerId}`, 'call_update', publicCall(row));
        log(`refused ${c.id}: ${endReason}`);
    };

    const status = await getCallStatus(ownerId);
    if (status.state !== 'ready') return refuse(status.state);

    const cs = status.callSettings;
    if (!cs.allowOutsideHours && !elig.isWithinHours(elig.effectiveHours(cs, settings.whatsappAutomations))) {
        return refuse('outside_hours', 'closedMessage');
    }

    let targets = await stageOneTargets(ownerId, conv);
    let stage = 1;
    if (!targets.length) { // nobody in stage 1 can ring: go straight to everyone
        targets = await stageTwoTargets(ownerId);
        stage = 2;
    }
    if (!targets.length) return refuse('no_devices', 'missedCallMessage');

    const row = await Call.create({
        userId: ownerId, conversationId: conv.id, metaCallId: c.id, phoneNumber: phone,
        contactName: conv.contactName || contactName, status: 'ringing', sdpOffer: sdp,
        ringStage: stage, ringTargets: targets, stage2At: stage === 2 ? new Date() : null,
    });
    emit(`team_${ownerId}`, 'call_update', publicCall(row));
    await ring(row, targets);
}

/** Customer hung up (before or after answer), or Meta ended the call. */
async function handleTerminate({ settings, call: c }) {
    const row = await Call.findOne({ where: { metaCallId: c.id } });
    if (!row) return;
    if (row.status === 'ringing') {
        await finish(row, 'missed', 'caller_hung_up', { settings, autoMessage: 'missedCallMessage' });
    } else if (row.status === 'answered') {
        const end = new Date();
        const dur = c.duration ? Number(c.duration) : Math.max(0, Math.round((end - new Date(row.answeredAt || row.startedAt)) / 1000));
        await row.update({ status: 'ended', endReason: 'completed', endedAt: end, durationSec: dur });
        await logCallEvent(row);
        emit(`team_${row.userId}`, 'call_update', publicCall(row));
    }
}

/** A member answers with their WebRTC answer SDP. First answer wins. */
async function answer(call, user, sdpAnswer, settings) {
    const [claimed] = await Call.update(
        { status: 'answered', answeredBy: user.id, answeredByName: user.name, answeredAt: new Date() },
        { where: { id: call.id, status: 'ringing' } },
    );
    if (!claimed) return { ok: false, code: 'already_handled' };
    await call.reload();
    try {
        await meta.acceptCall(settings, call.metaCallId, sdpAnswer);
    } catch (e) {
        const msg = e.response?.data?.error?.message || e.message;
        warn(`accept failed ${call.id}: ${msg}`);
        await call.update({ status: 'failed', endReason: 'accept_failed', endedAt: new Date() });
        await logCallEvent(call);
        emit(`team_${call.userId}`, 'call_update', publicCall(call));
        return { ok: false, code: 'accept_failed', message: msg };
    }
    await stopRinging(call, 'answeredElsewhere', user.id);
    return { ok: true };
}

async function decline(call, userId, settings) {
    if (call.status !== 'ringing') return;
    const declined = Array.from(new Set([...(call.declinedBy || []), userId]));
    await call.update({ declinedBy: declined });
    const pending = (call.ringTargets || []).filter((id) => !declined.includes(id));
    if (pending.length) return;
    if (call.ringStage === 1) return advanceToStageTwo(call, settings);
    await finish(call, 'declined', 'declined', { settings, rejectAtMeta: true, autoMessage: 'missedCallMessage' });
}

async function hangup(call, settings) {
    if (call.status === 'ringing') return finish(call, 'declined', 'declined', { settings, rejectAtMeta: true });
    if (call.status !== 'answered') return false;
    await meta.terminateCall(settings, call.metaCallId).catch((e) => warn(`terminate failed ${call.id}:`, e.response?.data?.error?.message || e.message));
    const end = new Date();
    await call.update({ status: 'ended', endReason: 'completed', endedAt: end, durationSec: Math.max(0, Math.round((end - new Date(call.answeredAt || call.startedAt)) / 1000)) });
    await logCallEvent(call);
    emit(`team_${call.userId}`, 'call_update', publicCall(call));
    return true;
}

async function advanceToStageTwo(call, settings) {
    const [n] = await Call.update({ ringStage: 2, stage2At: new Date() }, { where: { id: call.id, status: 'ringing', ringStage: 1 } });
    if (!n) return;
    await call.reload();
    const everyone = await stageTwoTargets(call.userId);
    const fresh = everyone.filter((id) => !(call.ringTargets || []).includes(id));
    if (!fresh.length) {
        // nobody else can be rung: wait out the timeout on the existing targets (or end now if all declined)
        if ((call.ringTargets || []).every((id) => (call.declinedBy || []).includes(id))) {
            await finish(call, 'declined', 'declined', { settings, rejectAtMeta: true, autoMessage: 'missedCallMessage' });
        }
        return;
    }
    await call.update({ ringTargets: [...(call.ringTargets || []), ...fresh] });
    await ring(call, fresh);
}

/** Runs every few seconds: stage-2 fallback and the no-answer timeout. Safe to run on many instances. */
async function sweep() {
    const ringing = await Call.findAll({ where: { status: 'ringing' } });
    for (const call of ringing) {
        try {
            const ageSec = (Date.now() - new Date(call.startedAt).getTime()) / 1000;
            const settings = await Settings.findOne({ where: { userId: call.userId } });
            if (!settings) continue;
            if (ageSec >= RING_TIMEOUT_SEC) {
                await finish(call, 'missed', 'no_answer', { settings, rejectAtMeta: true, autoMessage: 'missedCallMessage' });
            } else if (call.ringStage === 1 && ageSec >= elig.resolveCallSettings(settings.callSettings).fallbackAfterSec) {
                await advanceToStageTwo(call, settings);
            }
        } catch (e) {
            console.error('[CALL] sweep error:', e.message);
        }
    }
}

let sweepTimer = null;
function startSweep() {
    if (sweepTimer) return;
    sweepTimer = setInterval(() => sweep().catch((e) => console.error('[CALL] sweep failed:', e.message)), 4000);
    sweepTimer.unref?.();
    log('call sweep started');
}

module.exports = {
    RING_TIMEOUT_SEC,
    hasVoiceAddon,
    getCallStatus,
    handleCallsWebhook,
    handleIncoming,
    handleTerminate,
    answer,
    decline,
    hangup,
    sweep,
    startSweep,
    publicCall,
    logCallEvent,
    callEventText,
    rangMembers,
    stageOneTargets,
    stageTwoTargets,
};
