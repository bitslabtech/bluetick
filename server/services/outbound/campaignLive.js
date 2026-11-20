/**
 * Tells open broadcast pages that a campaign's numbers changed, so they can refresh without polling.
 *
 * Load control: at most one event per campaign every THROTTLE_MS, however many messages change
 * (a burst of 5,000 reads becomes a few events, not 5,000). The event carries only the campaign id;
 * the page then asks for just what changed (GET /api/messages/:id/live).
 *
 * Sent to the workspace team room, which the owner and every team member join (see socket.js).
 * Never throws: a failed notification must not affect sending or webhook handling.
 */
const THROTTLE_MS = 3000;

const state = new Map(); // campaignId -> { ownerId, last, timer }

function emit(campaignId) {
    const s = state.get(campaignId);
    if (!s) return;
    s.timer = null;
    s.last = Date.now();
    try {
        const { getIo } = require('../../socket');
        getIo().to(`team_${s.ownerId}`).emit('campaign_update', { campaignId });
    } catch { /* socket not ready (tests, startup) — the page's fallback poll covers it */ }
}

function notifyCampaign(ownerId, campaignId) {
    if (!ownerId || !campaignId) return;
    const key = String(campaignId);
    const now = Date.now();
    let s = state.get(key);
    if (!s) {
        s = { ownerId, last: 0, timer: null };
        state.set(key, s);
    }
    if (s.timer) return; // an event is already scheduled and will include this change
    const wait = s.last + THROTTLE_MS - now;
    if (wait <= 0) emit(key);
    else s.timer = setTimeout(() => emit(key), wait);
}

// Forget campaigns that have been quiet for a while so the map stays small
setInterval(() => {
    const cutoff = Date.now() - 60 * 1000;
    for (const [k, s] of state) if (!s.timer && s.last < cutoff) state.delete(k);
}, 60 * 1000).unref();

module.exports = { notifyCampaign, THROTTLE_MS };
