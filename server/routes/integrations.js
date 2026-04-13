const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { Op } = require('sequelize');
const ApiKey = require('../models/ApiKey');
const Webhook = require('../models/Webhook');
const auth = require('../middleware/auth');
const Plan = require('../models/Plan');
const ApiUsageLog = require('../models/ApiUsageLog');
const { getUserPlanLimits, getMonthlyMessageCount } = require('../utils/planLimits');

// Middleware to check if user's plan allows API access
const checkPlanAccess = async (req, res, next) => {
    try {
        const plan = await Plan.findOne({ where: { name: req.user.plan } });
        if (!plan || !plan.allowApiAccess) {
            return res.status(403).json({ error: 'Your current plan does not support Integrations & API access. Please upgrade.' });
        }
        next();
    } catch(err) {
        res.status(500).json({ error: 'Failed to verify plan limits' });
    }
};

// ==========================================
// API KEY MANAGEMENT
// ==========================================

// Get all keys
router.get('/keys', auth, checkPlanAccess, async (req, res) => {
    try {
        const keys = await ApiKey.findAll({ 
            where: { userId: req.user.id },
            attributes: ['id', 'label', 'keyPrefix', 'last4', 'scopes', 'lastUsedAt', 'isActive', 'createdAt']
        });
        res.json(keys);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Generate new key
router.post('/keys', auth, checkPlanAccess, async (req, res) => {
    try {
        const { label, scopes } = req.body;

        // Generate a secure random key with a recognizable prefix
        // Format: sk_live_<64 hex chars>
        // The prefix 'sk_live_' enables GitHub/GitLab secret scanning to detect leaked keys
        const rawKey = 'sk_live_' + crypto.randomBytes(32).toString('hex');
        const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
        const last4 = rawKey.slice(-4);
        const keyPrefix = rawKey.slice(0, 15); // 'sk_live_' + 7 chars = safe preview

        // Validate scopes if provided
        const allowedScopes = ['messages:send', 'contacts:read', 'contacts:write', 'templates:read'];
        const resolvedScopes = Array.isArray(scopes)
            ? scopes.filter(s => allowedScopes.includes(s))
            : ['messages:send', 'contacts:read']; // default scopes

        const newKey = await ApiKey.create({
            userId: req.user.id,
            label: label || 'Default Key',
            keyHash,
            keyPrefix,
            last4,
            scopes: resolvedScopes
        });

        // IMPORTANT: We only return the rawKey ONCE. The client must save it now.
        res.json({
            id: newKey.id,
            label: newKey.label,
            keyPrefix: newKey.keyPrefix,
            last4: newKey.last4,
            scopes: newKey.scopes,
            rawKey: rawKey // ONLY SENT ONCE — never stored in plain text
        });
    } catch (err) {
        console.error('[integrations] Key generation error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Revoke a key (soft-delete: mark inactive for audit trail)
router.delete('/keys/:id', auth, checkPlanAccess, async (req, res) => {
    try {
        const key = await ApiKey.findOne({ where: { id: req.params.id, userId: req.user.id } });
        if (!key) return res.status(404).json({ error: 'Key not found' });
        
        // Soft revoke — keeps the record for audit trail, just prevents future auth
        await key.update({ isActive: false });
        res.json({ message: 'Key revoked successfully.' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// ==========================================
// WEBHOOK MANAGEMENT
// ==========================================

// Get all webhooks
router.get('/webhooks', auth, checkPlanAccess, async (req, res) => {
    try {
        const webhooks = await Webhook.findAll({ 
            where: { userId: req.user.id },
            attributes: ['id', 'url', 'events', 'isActive', 'failureCount', 'lastFailedAt', 'createdAt']
        });
        res.json(webhooks);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Add a webhook
router.post('/webhooks', auth, checkPlanAccess, async (req, res) => {
    try {
        const { url, events } = req.body;
        
        // Generate a signing secret so client can verify payload came from us
        const secret = 'whsec_' + crypto.randomBytes(24).toString('base64').replace(/[^a-zA-Z0-9]/g, '');

        const newWebhook = await Webhook.create({
            userId: req.user.id,
            url,
            events: events || ['message.received'],
            secret
        });

        res.json({
            id: newWebhook.id,
            url: newWebhook.url,
            events: newWebhook.events,
            secret: newWebhook.secret // The user needs this to verify HMAC
        });
    } catch (err) {
        res.status(500).json({ error: err.errors ? err.errors[0].message : 'Server error' });
    }
});

// Delete webhook
router.delete('/webhooks/:id', auth, checkPlanAccess, async (req, res) => {
    try {
        const webhook = await Webhook.findOne({ where: { id: req.params.id, userId: req.user.id } });
        if (!webhook) return res.status(404).json({ error: 'Webhook not found' });
        
        await webhook.destroy();
        res.json({ message: 'Webhook deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// ==========================================
// USAGE ANALYTICS PROXY
// ==========================================

/**
 * GET /api/integrations/usage
 * Dashboard proxy — returns the same data as GET /v1/usage but
 * authenticated via JWT session (not API key). Used by the Integrations
 * "Usage Analytics" tab in the client dashboard.
 */
router.get('/usage', auth, checkPlanAccess, async (req, res) => {
    try {
        const userId = req.user.id;

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const limits = await getUserPlanLimits(userId);
        const sentThisMonth = await getMonthlyMessageCount(userId);

        const [totalCalls, successCalls, errorCalls, recentCalls] = await Promise.all([
            ApiUsageLog.count({ where: { userId, createdAt: { [Op.gte]: startOfMonth } } }),
            ApiUsageLog.count({ where: { userId, statusCode: { [Op.between]: [200, 299] }, createdAt: { [Op.gte]: startOfMonth } } }),
            ApiUsageLog.count({ where: { userId, statusCode: { [Op.gte]: 400 }, createdAt: { [Op.gte]: startOfMonth } } }),
            ApiUsageLog.findAll({
                where: { userId },
                order: [['createdAt', 'DESC']],
                limit: 20,
                attributes: ['id', 'method', 'endpoint', 'statusCode', 'responseTimeMs', 'templateName', 'recipientPhone', 'errorMessage', 'createdAt']
            })
        ]);

        res.json({
            plan: {
                name: limits.planName,
                messageLimit: limits.messageLimit === -1 ? 'unlimited' : limits.messageLimit,
                messagesUsedThisMonth: sentThisMonth,
                messagesRemaining: limits.messageLimit === -1 ? 'unlimited' : Math.max(0, limits.messageLimit - sentThisMonth)
            },
            apiCalls: {
                totalThisMonth: totalCalls,
                successThisMonth: successCalls,
                errorsThisMonth: errorCalls,
                successRate: totalCalls > 0 ? `${Math.round((successCalls / totalCalls) * 100)}%` : 'N/A'
            },
            recentCalls
        });
    } catch (err) {
        console.error('[integrations/usage] Error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
