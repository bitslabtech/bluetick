const crypto = require('crypto');
const ApiKey = require('../models/ApiKey');
const User = require('../models/User');
const Plan = require('../models/Plan');

module.exports = async function (req, res, next) {
    const apiKeyRaw = req.header('x-api-key');

    if (!apiKeyRaw) {
        return res.status(401).json({ error: 'No API key provided. Add your key in the x-api-key header.' });
    }

    try {
        // Hash the incoming key to compare with the database
        const keyHash = crypto.createHash('sha256').update(apiKeyRaw).digest('hex');

        // Look up the key
        const apiKey = await ApiKey.findOne({ where: { keyHash, isActive: true } });

        if (!apiKey) {
            return res.status(401).json({ error: 'Invalid or revoked API key.' });
        }

        // Fetch user
        const dbUser = await User.findByPk(apiKey.userId);
        if (!dbUser) {
            return res.status(401).json({ error: 'User associated with this key no longer exists.' });
        }

        // ─── Subscription Checks ───────────────────────────────────────────────

        // 1. Check plan allows API access
        const plan = await Plan.findOne({ where: { name: dbUser.plan } });
        if (!plan || !plan.allowApiAccess) {
            return res.status(403).json({
                error: 'Your current subscription plan does not include Developer API access. Please upgrade.',
                code: 'PLAN_NO_API_ACCESS'
            });
        }

        // 2. Check subscription is active (handles manual suspensions)
        if (dbUser.planStatus && dbUser.planStatus !== 'Active') {
            return res.status(403).json({
                error: `Your subscription is currently ${dbUser.planStatus}. Please contact support or renew your plan.`,
                code: 'PLAN_INACTIVE'
            });
        }

        // 3. Check subscription has not expired
        if (dbUser.planExpiry && new Date(dbUser.planExpiry) < new Date()) {
            return res.status(403).json({
                error: 'Your subscription has expired. Please renew your plan to continue using the API.',
                code: 'PLAN_EXPIRED',
                expiredAt: dbUser.planExpiry
            });
        }

        // ─── Attach context to request ─────────────────────────────────────────

        // Update lastUsedAt non-blocking
        ApiKey.update({ lastUsedAt: new Date() }, { where: { id: apiKey.id } })
            .catch(err => console.error('[apiAuth] Failed updating lastUsedAt:', err));

        // Expose resolved api key id and scopes for downstream use
        req.apiKey = {
            id: apiKey.id,
            scopes: apiKey.scopes || ['messages:send', 'contacts:read']
        };

        // Attach user to request, mirroring standard auth.js
        req.user = {
            id: dbUser.id,
            realId: dbUser.id,
            parentUserId: dbUser.parentUserId,
            teamRole: dbUser.teamRole,
            teamPermissions: dbUser.teamPermissions,
            teamPolicy: dbUser.teamPolicy,
            plan: dbUser.plan
        };

        // MAGIC INHERITANCE: If acting as a team member, alias all queries to parent's workspace
        if (dbUser.parentUserId) {
            req.user.id = dbUser.parentUserId;
        }

        next();
    } catch (err) {
        console.error('[apiAuth] Error:', err);
        res.status(500).json({ error: 'Server error during API authentication.' });
    }
};
