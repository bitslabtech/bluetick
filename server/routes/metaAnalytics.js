const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getUsageSummary, ymd } = require('../utils/waUsage');

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function resolveRange(range, from, to) {
    const now = new Date();
    const today = ymd(now);
    const monthStart = today.slice(0, 8) + '01';
    if (range === 'last_month') {
        const first = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
        const last = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0));
        return { from: ymd(first), to: ymd(last) };
    }
    if (range === 'last_30') return { from: ymd(new Date(now.getTime() - 29 * 86400000)), to: today };
    if (range === 'custom' && DATE_RE.test(from || '') && DATE_RE.test(to || '')) return { from, to };
    return { from: monthStart, to: today };
}

/**
 * GET /api/whatsapp/meta-analytics?range=this_month|last_month|last_30|custom&from=YYYY-MM-DD&to=YYYY-MM-DD&refresh=1
 *
 * Usage & estimated spend for the workspace's WhatsApp number. Money and volume come from
 * Meta's pricing_analytics (copied into WaUsageDaily); the by-feature table comes from our own
 * per-message records. Bluetick never holds balances or payments: Meta bills the customer directly.
 */
router.get('/', auth, async (req, res) => {
    try {
        const ownerId = req.user.parentUserId || req.user.id;
        const { from, to } = resolveRange(req.query.range, req.query.from, req.query.to);
        const summary = await getUsageSummary(ownerId, from, to, { force: req.query.refresh === '1' });
        if (!summary.connected) {
            return res.status(422).json({
                error: 'WhatsApp account not connected',
                detail: 'Connect your WhatsApp Business Account in Settings to see usage and spend.'
            });
        }
        return res.json(summary);
    } catch (err) {
        console.error('[META-ANALYTICS] Unexpected error:', err.message);
        return res.status(500).json({ error: 'Failed to load usage data' });
    }
});

module.exports = router;
