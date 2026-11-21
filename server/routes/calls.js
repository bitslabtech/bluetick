const express = require('express');
const { Op } = require('sequelize');
const router = express.Router();
const auth = require('../middleware/auth');
const Call = require('../models/Call');
const Conversation = require('../models/Conversation');
const Settings = require('../models/Settings');
const CallService = require('../services/CallService');
const meta = require('../utils/metaCalling');
const elig = require('../utils/callEligibility');
const Template = require('../models/Template');
const callTemplates = require('../utils/callTemplates');

router.use(auth);

const ownerOf = (req) => req.user.parentUserId || req.user.id;
const canManage = (req) => !req.user.parentUserId || req.user.teamRole === 'admin';
/** Normalise one auto-message block from the request over the current value. */
function messageBlock(input, cur, text) {
    if (!input) return cur;
    return {
        enabled: typeof input.enabled === 'boolean' ? input.enabled : cur.enabled,
        mode: input.mode === 'template' || input.mode === 'text' ? input.mode : cur.mode,
        text: text(input.text, cur.text),
        templateId: input.templateId === null ? null : (typeof input.templateId === 'string' ? input.templateId : cur.templateId),
    };
}
const fail = (res, code, error, extra = {}) => res.status(code).json({ error, ...extra });

/** Everything except /status needs the voice add-on. */
async function requireVoice(req, res, next) {
    try {
        if (await CallService.hasVoiceAddon(ownerOf(req))) return next();
        return fail(res, 403, 'Add-on Required', { code: 'addon_required' });
    } catch (e) {
        console.error('[CALLS] entitlement check failed:', e.message);
        return fail(res, 500, 'Server Error');
    }
}

async function loadCall(req, res) {
    const call = await Call.findOne({ where: { id: req.params.id, userId: ownerOf(req) } });
    if (!call) { fail(res, 404, 'Call not found'); return null; }
    return call;
}

// GET /api/calls/status: what the app should show (addon_required | not_eligible | disabled | ready | ...)
router.get('/status', async (req, res) => {
    try {
        const s = await CallService.getCallStatus(ownerOf(req));
        // Calling was switched off at Meta automatically and the workspace qualifies again (e.g. the
        // add-on was just renewed): switch it back on now instead of waiting for the hourly job.
        if (s.callSettings?.suspended && s.state === 'ready') {
            const settings = await Settings.findOne({ where: { userId: ownerOf(req) } });
            if (settings && (await CallService.reconcileCalling(settings)) === 'restored') {
                const fresh = await CallService.getCallStatus(ownerOf(req));
                return res.json({ ...fresh, canManage: canManage(req) });
            }
        }
        res.json({ ...s, canManage: canManage(req) });
    } catch (e) {
        console.error('[CALLS] status:', e.message);
        fail(res, 500, 'Server Error');
    }
});

// PUT /api/calls/settings (owner / admin): turn calling on or off and edit the rules
router.put('/settings', requireVoice, async (req, res) => {
    try {
        if (!canManage(req)) return fail(res, 403, 'Only the owner or an admin can change call settings');
        const ownerId = ownerOf(req);
        const status = await CallService.getCallStatus(ownerId);
        if (status.state === 'whatsapp_not_connected') return fail(res, 400, 'Connect WhatsApp first', { code: status.state });
        if (status.state === 'not_eligible') {
            return fail(res, 400, `Voice calling needs a messaging limit of ${elig.MIN_MESSAGING_LIMIT.toLocaleString()} or more`, { code: status.state });
        }

        const b = req.body || {};
        const cur = status.callSettings;
        const text = (v, d) => (typeof v === 'string' ? v.trim().slice(0, 1000) : d);
        const next = {
            ...cur,
            enabled: typeof b.enabled === 'boolean' ? b.enabled : cur.enabled,
            allowOutsideHours: typeof b.allowOutsideHours === 'boolean' ? b.allowOutsideHours : cur.allowOutsideHours,
            hours: b.hours === null ? null : (b.hours && Array.isArray(b.hours.schedule) ? { timezone: String(b.hours.timezone || 'UTC'), schedule: b.hours.schedule } : cur.hours),
            missedCallMessage: messageBlock(b.missedCallMessage, cur.missedCallMessage, text),
            closedMessage: messageBlock(b.closedMessage, cur.closedMessage, text),
            fallbackAfterSec: Number.isFinite(Number(b.fallbackAfterSec)) ? Math.min(35, Math.max(5, Math.round(Number(b.fallbackAfterSec)))) : cur.fallbackAfterSec,
        };

        for (const key of ['missedCallMessage', 'closedMessage']) {
            const m = next[key];
            if (m.mode === 'template') {
                const t = m.templateId ? await Template.findOne({ where: { id: m.templateId, userId: ownerId } }) : null;
                if (!t) return fail(res, 400, 'Choose a template for the automatic message');
                if (t.status === 'APPROVED') {
                    const u = elig.templateUsable(t);
                    if (!u.ok) return fail(res, 400, u.reason);
                }
            }
        }

        const settings = await Settings.findOne({ where: { userId: ownerId } });
        // Apply on/off at Meta first so we never claim "enabled" when Meta refused.
        if (next.enabled !== cur.enabled) {
            try {
                await meta.setCallingStatus(settings, next.enabled);
            } catch (e) {
                const msg = e.response?.data?.error?.message || e.message;
                return fail(res, 502, `WhatsApp refused the change: ${msg}`, { code: 'meta_error' });
            }
        }
        // The owner just set Meta's switch themselves, so any automatic suspension no longer applies.
        if (next.enabled !== cur.enabled) delete next.suspended;
        settings.callSettings = next;
        settings.changed('callSettings', true);
        await settings.save();
        res.json({ ...(await CallService.getCallStatus(ownerId)), canManage: canManage(req) });
    } catch (e) {
        console.error('[CALLS] settings:', e.message);
        fail(res, 500, 'Server Error');
    }
});

// GET /api/calls/message-templates: the workspace's templates the auto messages can use, + the suggestions
router.get('/message-templates', requireVoice, async (req, res) => {
    try {
        const rows = await Template.findAll({ where: { userId: ownerOf(req) }, order: [['createdAt', 'DESC']], limit: 200 });
        const templates = rows.map((t) => {
            const u = elig.templateUsable(t);
            return { id: t.id, name: t.name, content: t.content, status: t.status, category: t.category, usable: u.ok, reason: u.ok ? null : u.reason, ...elig.templatePreview(t) };
        });
        res.json({ templates, suggestions: [callTemplates.suggestion('missedCallMessage'), callTemplates.suggestion('closedMessage')] });
    } catch (e) {
        console.error('[CALLS] message-templates:', e.message);
        fail(res, 500, 'Server Error');
    }
});

// POST /api/calls/message-templates (owner / admin): submit the suggested template to Meta and select it
router.post('/message-templates', requireVoice, async (req, res) => {
    try {
        if (!canManage(req)) return fail(res, 403, 'Only the owner or an admin can create templates');
        const ownerId = ownerOf(req);
        const which = req.body?.which;
        if (which !== 'missedCallMessage' && which !== 'closedMessage') return fail(res, 400, 'Unknown message');
        const settings = await Settings.findOne({ where: { userId: ownerId } });
        let template;
        try {
            template = await callTemplates.createSuggested(ownerId, settings, which, req.body?.body);
        } catch (e) {
            return fail(res, 400, e.message);
        }
        const cur = elig.resolveCallSettings(settings.callSettings);
        settings.callSettings = { ...cur, [which]: { ...cur[which], enabled: true, mode: 'template', templateId: template.id } };
        settings.changed('callSettings', true);
        await settings.save();
        res.json({ ...(await CallService.getCallStatus(ownerId)), canManage: canManage(req) });
    } catch (e) {
        console.error('[CALLS] create message template:', e.message);
        fail(res, 500, 'Server Error');
    }
});

// GET /api/calls/ice-servers: STUN always; TURN only when TURN_ENABLED=true and configured
// (Cloudflare or static env). Off by default: calls connect directly to Meta on most networks.
router.get('/ice-servers', requireVoice, async (req, res) => {
    const iceServers = [{ urls: ['stun:stun.cloudflare.com:3478', 'stun:stun.l.google.com:19302'] }];
    if (process.env.TURN_ENABLED !== 'true') return res.json({ iceServers });
    try {
        const { CF_TURN_KEY_ID, CF_TURN_API_TOKEN, TURN_URLS, TURN_USERNAME, TURN_CREDENTIAL } = process.env;
        if (CF_TURN_KEY_ID && CF_TURN_API_TOKEN) {
            const r = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${CF_TURN_KEY_ID}/credentials/generate-ice-servers`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${CF_TURN_API_TOKEN}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ ttl: 3600 }),
            });
            const j = await r.json();
            if (Array.isArray(j.iceServers)) return res.json({ iceServers: [...iceServers, ...j.iceServers] });
        } else if (TURN_URLS && TURN_USERNAME && TURN_CREDENTIAL) {
            iceServers.push({ urls: TURN_URLS.split(',').map((s) => s.trim()), username: TURN_USERNAME, credential: TURN_CREDENTIAL });
        }
    } catch (e) {
        console.warn('[CALLS] TURN lookup failed, using STUN only:', e.message);
    }
    res.json({ iceServers });
});

// GET /api/calls: history (newest first). ?limit=30&before=<ISO date>
router.get('/', requireVoice, async (req, res) => {
    try {
        const ownerId = ownerOf(req);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 30));
        const where = { userId: ownerId };
        if (req.query.before) where.createdAt = { [Op.lt]: new Date(req.query.before) };

        // Members limited to "assigned" chats only see calls on their chats or calls they answered.
        if (req.user.parentUserId && req.user.teamRole !== 'admin' && (req.user.teamPolicy?.inboxVisibility || 'see_all') === 'see_assigned') {
            const mine = await Conversation.findAll({ where: { userId: ownerId, assignedTo: req.user.realId }, attributes: ['id'] });
            where[Op.or] = [{ conversationId: { [Op.in]: mine.map((c) => c.id) } }, { answeredBy: req.user.realId }];
        }

        const rows = await Call.findAll({ where, order: [['createdAt', 'DESC']], limit });
        res.json({ calls: rows.map(CallService.publicCall), hasMore: rows.length === limit });
    } catch (e) {
        console.error('[CALLS] history:', e.message);
        fail(res, 500, 'Server Error');
    }
});

// GET /api/calls/:id: the answering device fetches the offer here (too big for a push payload)
router.get('/:id', requireVoice, async (req, res) => {
    try {
        const call = await loadCall(req, res);
        if (!call) return;
        const out = CallService.publicCall(call);
        if (call.status === 'ringing') out.sdpOffer = call.sdpOffer;
        out.ringStage = call.ringStage;
        out.rang = await CallService.rangMembers(call);
        res.json(out);
    } catch (e) {
        console.error('[CALLS] get:', e.message);
        fail(res, 500, 'Server Error');
    }
});

// POST /api/calls/:id/answer { sdp }: first member to answer wins; others get 409
router.post('/:id/answer', requireVoice, async (req, res) => {
    try {
        const sdp = req.body?.sdp;
        if (typeof sdp !== 'string' || !sdp.includes('v=0')) return fail(res, 400, 'sdp (answer) required');
        const call = await loadCall(req, res);
        if (!call) return;
        const settings = await Settings.findOne({ where: { userId: call.userId } });
        const result = await CallService.answer(call, { id: req.user.realId || req.user.id, name: req.user.name || null }, sdp, settings);
        if (result.ok) return res.json({ ok: true });
        return fail(res, result.code === 'already_handled' ? 409 : 502, result.message || 'Could not connect the call', { code: result.code });
    } catch (e) {
        console.error('[CALLS] answer:', e.message);
        fail(res, 500, 'Server Error');
    }
});

// POST /api/calls/:id/decline: this member declines (the call keeps ringing for others)
router.post('/:id/decline', requireVoice, async (req, res) => {
    try {
        const call = await loadCall(req, res);
        if (!call) return;
        const settings = await Settings.findOne({ where: { userId: call.userId } });
        await CallService.decline(call, req.user.realId || req.user.id, settings);
        res.json({ ok: true });
    } catch (e) {
        console.error('[CALLS] decline:', e.message);
        fail(res, 500, 'Server Error');
    }
});

// POST /api/calls/:id/connected: the app reports media is flowing (starts the duration clock)
router.post('/:id/connected', requireVoice, async (req, res) => {
    try {
        const call = await loadCall(req, res);
        if (!call) return;
        if (call.status === 'answered' && call.answeredBy === (req.user.realId || req.user.id)) await call.update({ answeredAt: new Date() });
        res.json({ ok: true });
    } catch (e) {
        console.error('[CALLS] connected:', e.message);
        fail(res, 500, 'Server Error');
    }
});

// POST /api/calls/:id/hangup
router.post('/:id/hangup', requireVoice, async (req, res) => {
    try {
        const call = await loadCall(req, res);
        if (!call) return;
        const settings = await Settings.findOne({ where: { userId: call.userId } });
        await CallService.hangup(call, settings);
        res.json({ ok: true });
    } catch (e) {
        console.error('[CALLS] hangup:', e.message);
        fail(res, 500, 'Server Error');
    }
});

module.exports = router;
