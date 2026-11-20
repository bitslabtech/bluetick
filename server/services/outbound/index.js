/**
 * THE outbound WhatsApp gateway. Every message Bluetick sends must go through sendMessage().
 * (A test in tests/outboundGateway.test.js fails if code calls Meta's /messages endpoint directly.)
 *
 * In order, for each message:
 *   1. look up the account's WhatsApp credentials (one resolver for every feature)
 *   2. block WhatsApp API-to-API sends Meta would silently drop
 *   3. reserve one unit of the plan allowance (atomic — parallel sends cannot exceed the limit)
 *   4. write the ledger row BEFORE calling Meta, so nothing can leave unrecorded
 *   5. call Meta
 *   6. record the result: sent (with Meta's id) or failed (with code and reason); failures give
 *      the allowance back
 *
 * It never throws for Meta / policy errors: it returns { ok:false, error, errorCode }.
 * Use sendOrThrow() where the caller's existing code expects an exception.
 */
const axios = require('axios');
const OutboundMessage = require('../../models/OutboundMessage');
const { getSource, countsTowardPlan } = require('./sources');
const { resolveCredentials, resolvePlatformAccount } = require('./credentials');
const { getAccountTimezone, periodKey } = require('./time');
const allowance = require('./allowance');
const { friendlyReason } = require('./errors');
const { flushPending } = require('./status');

// Same Graph API version as every other Meta call (config/metaGraph.js)
const { GRAPH_VERSION, GRAPH_URL: GRAPH } = require('../../config/metaGraph');

const digitsOnly = (v) => String(v || '').replace(/\D/g, '');

function result(row, ok, extra = {}) {
    // A broadcast message was sent or failed: let open broadcast pages refresh (throttled)
    if (row?.campaignId) require('./campaignLive').notifyCampaign(row.ownerId, row.campaignId);
    return { ok, outboundId: row?.id || null, wamid: row?.wamid || null, ...extra };
}

/**
 * @param {object}  o
 * @param {string}  o.ownerId      workspace owner (ignored for platform sources)
 * @param {string}  o.source       key from sources.js (required)
 * @param {object}  o.payload      Meta message body; `to` and `messaging_product` are filled in
 * @param {string} [o.to]          recipient (defaults to payload.to)
 * @param {object} [o.refs]        { campaignId, conversationId, contactId, refType, refId, retryOf }
 * @param {string} [o.actorId]     team member who triggered it
 * @param {object} [o.credentials] { token, phoneNumberId } when the caller already has them
 * @param {boolean}[o.skipApiGuard]
 */
async function sendMessage(o) {
    const src = getSource(o.source); // throws on an unknown source: a programming error
    const payload = { messaging_product: 'whatsapp', ...o.payload };
    const toPhone = digitsOnly(o.to || payload.to);
    payload.to = toPhone;

    let ownerId = o.ownerId;
    let account = null;
    if (src.platform) {
        account = await resolvePlatformAccount();
        ownerId = account?.ownerId || ownerId;
    } else {
        account = o.credentials?.token && o.credentials?.phoneNumberId
            ? { token: o.credentials.token, phoneNumberId: o.credentials.phoneNumberId }
            : await resolveCredentials(ownerId);
    }
    if (!ownerId) return { ok: false, error: friendlyReason('NOT_CONNECTED'), errorCode: 'NOT_CONNECTED' };

    const refs = o.refs || {};
    const counts = countsTowardPlan(o.source);
    const now = new Date();
    const tz = await getAccountTimezone(ownerId);
    const base = {
        ownerId, actorId: o.actorId || null, platform: !!src.platform, source: o.source,
        toPhone, messageType: payload.type || null, templateName: payload.template?.name || null,
        campaignId: refs.campaignId || null, conversationId: refs.conversationId || null,
        contactId: refs.contactId || null, refType: refs.refType || null,
        refId: refs.refId != null ? String(refs.refId) : null, retryOf: refs.retryOf || null,
        countsTowardPlan: counts, periodKey: periodKey(now, tz)
    };
    const fail = async (code, raw, extra = {}) => {
        const row = await OutboundMessage.create({
            ...base, status: code === 'PLAN_LIMIT' ? 'blocked' : 'failed',
            errorCode: String(code), errorReason: friendlyReason(code, raw), failedAt: now
        });
        return result(row, false, { error: friendlyReason(code, raw), errorCode: String(code), ...extra });
    };

    if (!account?.token || !account?.phoneNumberId) return fail('NOT_CONNECTED');
    if (!toPhone || toPhone.length < 6) return fail('LOCAL', 'Recipient phone number is missing or invalid');

    if (!src.platform && !o.skipApiGuard) {
        const { isWhatsAppApiNumber } = require('../../utils/apiNumberGuard');
        if (await isWhatsAppApiNumber(toPhone)) return fail('API_TO_API');
    }

    let reservation = null;
    if (counts) {
        reservation = await allowance.reserve(ownerId, now);
        if (!reservation.ok) return fail('PLAN_LIMIT', null, { used: reservation.used, limit: reservation.limit });
        base.periodKey = reservation.period;
    }

    const row = await OutboundMessage.create({ ...base, status: 'queued', counted: !!reservation });

    let res;
    try {
        res = await axios.post(`${GRAPH}/${account.phoneNumberId}/messages`, payload, {
            headers: { Authorization: `Bearer ${account.token}`, 'Content-Type': 'application/json' },
            timeout: 30000,
            validateStatus: () => true,
            btGateway: true // tells the runtime guard (guard.js) this send is recorded
        });
    } catch (err) {
        await row.update({ status: 'failed', errorCode: 'NETWORK', errorReason: friendlyReason('NETWORK'), failedAt: new Date(), counted: false });
        if (reservation) await allowance.release(ownerId, reservation.period);
        return result(row, false, { error: err.message, errorCode: 'NETWORK' });
    }

    const data = res.data || {};
    const wamid = data?.messages?.[0]?.id;
    if (res.status >= 200 && res.status < 300 && wamid) {
        await row.update({ wamid, status: 'sent', sentAt: new Date() });
        flushPending(wamid).catch(e => console.error('[OUTBOUND] flushPending:', e.message));
        return result(row, true, { data, httpStatus: res.status });
    }

    const metaErr = data?.error || {};
    const code = metaErr.code ?? res.status;
    await row.update({
        status: 'failed', errorCode: String(code), errorReason: friendlyReason(code, metaErr.message),
        failedAt: new Date(), counted: false
    });
    if (reservation) await allowance.release(ownerId, reservation.period);
    return result(row, false, {
        error: metaErr.message || `Meta API error (HTTP ${res.status})`,
        errorCode: String(code), friendly: friendlyReason(code, metaErr.message),
        data, httpStatus: res.status
    });
}

// For callers whose existing code expects an exception on failure
async function sendOrThrow(o) {
    const r = await sendMessage(o);
    if (!r.ok) {
        const err = new Error(r.error || 'Message not sent');
        err.code = r.errorCode;
        err.friendly = r.friendly || r.error;
        err.response = { data: r.data || { error: { message: r.error, code: r.errorCode } }, status: r.httpStatus };
        err.outbound = r;
        throw err;
    }
    return r;
}

// Record an attempt that failed before reaching Meta (e.g. a campaign template could not be built)
async function recordLocalFailure({ ownerId, source, to, refs = {}, reason, code = 'LOCAL', actorId = null }) {
    try {
        getSource(source);
        const tz = await getAccountTimezone(ownerId);
        const row = await OutboundMessage.create({
            ownerId, actorId, source, toPhone: digitsOnly(to), status: 'failed',
            campaignId: refs.campaignId || null, conversationId: refs.conversationId || null,
            contactId: refs.contactId || null, refType: refs.refType || null,
            refId: refs.refId != null ? String(refs.refId) : null, retryOf: refs.retryOf || null,
            errorCode: String(code), errorReason: friendlyReason(code, reason),
            countsTowardPlan: countsTowardPlan(source), counted: false,
            periodKey: periodKey(new Date(), tz), failedAt: new Date()
        });
        if (row.campaignId) require('./campaignLive').notifyCampaign(row.ownerId, row.campaignId);
        return row;
    } catch (err) {
        console.error('[OUTBOUND] recordLocalFailure failed:', err.message);
        return null;
    }
}

// A campaign retry superseded this row (it no longer counts anywhere)
async function markRetried(where) {
    await OutboundMessage.update({ status: 'retried' }, { where: { ...where, status: { [require('sequelize').Op.in]: ['retry_pending', 'failed'] } } });
    // No live notice here: the retry send that follows notifies (see result())
}

module.exports = { sendMessage, sendOrThrow, recordLocalFailure, markRetried, GRAPH, GRAPH_VERSION };
