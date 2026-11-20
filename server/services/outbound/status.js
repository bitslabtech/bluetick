// Forward-only status rules for the ledger (and the inbox / campaign tables).
// Meta does not guarantee the order of status webhooks, so a late "delivered" must never undo "read".
const { Op } = require('sequelize');
const { fromStatusUpdate } = require('./errors');

const RANK = { queued: 0, sent: 1, delivered: 2, read: 3, clicked: 4 };

// May a message move from `current` to `next`?
function canMove(current, next) {
    const c = String(current || 'queued').toLowerCase();
    const n = String(next || '').toLowerCase();
    if (n === 'failed') return c === 'queued' || c === 'sent' || c === 'failed';
    if (!(n in RANK)) return false;
    if (!(c in RANK)) return false; // failed / retry_pending / retried / blocked are final for webhook updates
    return RANK[n] > RANK[c];
}

// ── Early statuses ────────────────────────────────────────────────────────────
// Meta can send a status before our own code has saved the message id. Hold it briefly; if the
// gateway never claims it, the message was sent outside Bluetick and gets an "external" row.
const HOLD_MS = 90 * 1000;
const pending = new Map(); // wamid -> { ownerId, updates: [], timer }

function hold(ownerId, statusUpdate) {
    const wamid = statusUpdate.id;
    let entry = pending.get(wamid);
    if (!entry) {
        entry = { ownerId, updates: [], timer: null };
        entry.timer = setTimeout(() => adoptExternal(wamid).catch(err =>
            console.error('[OUTBOUND] external adopt failed:', err.message)), HOLD_MS);
        if (entry.timer.unref) entry.timer.unref();
        pending.set(wamid, entry);
    }
    entry.updates.push(statusUpdate);
}

async function flushPending(wamid) {
    const entry = pending.get(wamid);
    if (!entry) return;
    clearTimeout(entry.timer);
    pending.delete(wamid);
    for (const u of entry.updates) await applyStatus(entry.ownerId, u, { noHold: true });
}

async function adoptExternal(wamid) {
    const entry = pending.get(wamid);
    if (!entry) return;
    pending.delete(wamid);
    const OutboundMessage = require('../../models/OutboundMessage');
    const first = entry.updates[0];
    const existing = await OutboundMessage.findOne({ where: { wamid }, paranoid: false });
    if (!existing) {
        await OutboundMessage.create({
            ownerId: entry.ownerId, source: 'external', wamid, toPhone: first.recipient_id || null,
            status: 'queued', countsTowardPlan: false, counted: false
        });
    }
    for (const u of entry.updates) await applyStatus(entry.ownerId, u, { noHold: true });
}

// ── Apply one Meta status webhook entry to the ledger ─────────────────────────
async function applyStatus(ownerId, statusUpdate, { noHold = false } = {}) {
    const OutboundMessage = require('../../models/OutboundMessage');
    const wamid = statusUpdate?.id;
    const next = String(statusUpdate?.status || '').toLowerCase();
    if (!wamid || !next) return null;

    const row = await OutboundMessage.findOne({ where: { wamid }, paranoid: false });
    if (!row) {
        if (!noHold && ownerId) hold(ownerId, statusUpdate);
        return null;
    }

    const at = statusUpdate.timestamp ? new Date(Number(statusUpdate.timestamp) * 1000) : new Date();
    const patch = {};
    const p = statusUpdate.pricing;
    if (p) {
        if (p.pricing_model) patch.pricingModel = String(p.pricing_model).toUpperCase();
        if (p.type) patch.pricingType = String(p.type).toUpperCase();
        if (p.category) patch.pricingCategory = String(p.category).toUpperCase();
        if (typeof p.billable === 'boolean') patch.billable = p.billable;
    }

    let released = false;
    if (canMove(row.status, next)) {
        if (next === 'failed') {
            const { code, reason } = fromStatusUpdate(statusUpdate);
            Object.assign(patch, { status: 'failed', errorCode: code, errorReason: reason, failedAt: at });
            if (row.counted) { patch.counted = false; released = true; }
        } else {
            patch.status = next;
            if (!row.sentAt) patch.sentAt = at;
            if (RANK[next] >= RANK.delivered && !row.deliveredAt) patch.deliveredAt = at;
            if (RANK[next] >= RANK.read && !row.readAt) patch.readAt = at;
        }
    }
    if (!Object.keys(patch).length) return row;

    // Conditional update so two webhooks racing cannot both release the allowance
    const [n] = await OutboundMessage.update(patch, { where: { id: row.id, status: row.status }, paranoid: false });
    if (n && released) await require('./allowance').release(row.ownerId, row.periodKey);
    if (n && row.campaignId) require('./campaignLive').notifyCampaign(row.ownerId, row.campaignId);
    return row;
}

// Campaign frequency cap (131049): the failed row becomes "retry_pending" until the retry is sent.
async function markRetryPending(wamid) {
    const OutboundMessage = require('../../models/OutboundMessage');
    const [, rows] = await OutboundMessage.update({ status: 'retry_pending' }, { where: { wamid, status: 'failed' }, returning: ['ownerId', 'campaignId'] });
    const r = rows?.[0];
    if (r?.campaignId) require('./campaignLive').notifyCampaign(r.ownerId, r.campaignId);
}

/**
 * A reply or button click proves the customer saw our messages, even when Meta never sends
 * "read" (read receipts turned off). contextWamid = the message they replied to, if any.
 */
async function inferReadFromReply(ownerId, phone, { contextWamid = null, isClick = false, at = new Date() } = {}) {
    try {
        const OutboundMessage = require('../../models/OutboundMessage');
        const digits = String(phone || '').replace(/\D/g, '');
        if (contextWamid) {
            const row = await OutboundMessage.findOne({ where: { wamid: contextWamid } });
            if (row) {
                const next = isClick ? 'clicked' : 'read';
                if (canMove(row.status, next)) {
                    const [n] = await OutboundMessage.update({
                        status: next,
                        sentAt: row.sentAt || at,
                        deliveredAt: row.deliveredAt || at,
                        readAt: row.readAt || at,
                        readInferred: row.readAt ? row.readInferred : true,
                        ...(isClick ? { clickedAt: at } : {})
                    }, { where: { id: row.id, status: row.status } });
                    if (n && row.campaignId) require('./campaignLive').notifyCampaign(row.ownerId, row.campaignId);
                }
            }
        }
        if (!ownerId || !digits) return;
        // Everything delivered (or sent) to this person in the last 30 days, before the reply, was seen
        const since = new Date(at.getTime() - 30 * 24 * 3600 * 1000);
        const [, changed] = await OutboundMessage.update(
            { status: 'read', readAt: at, readInferred: true },
            { where: { ownerId, toPhone: digits, status: { [Op.in]: ['sent', 'delivered'] }, createdAt: { [Op.between]: [since, at] } }, returning: ['campaignId'] }
        );
        const live = require('./campaignLive');
        for (const cid of new Set((changed || []).map(r => r.campaignId).filter(Boolean))) live.notifyCampaign(ownerId, cid);
        await OutboundMessage.update(
            { deliveredAt: at },
            { where: { ownerId, toPhone: digits, status: 'read', deliveredAt: null, readInferred: true } }
        );
    } catch (err) {
        console.error('[OUTBOUND] inferReadFromReply failed:', err.message);
    }
}

module.exports = { RANK, canMove, applyStatus, flushPending, markRetryPending, inferReadFromReply };
