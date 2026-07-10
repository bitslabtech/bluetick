const express = require('express');
const router = express.Router();
const Plan = require('../models/Plan');
const { Op } = require('sequelize');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const logActivity = require('../utils/logger');
const cacheManager = require('../utils/cacheManager');
const axios = require('axios');
const Settings = require('../models/Settings');
const SystemConfig = require('../models/SystemConfig');
const _publicPlansCache = cacheManager.createSimpleCache('public_plans', 60_000);

// GET All Plans (Admin - shows all plans)
router.get('/', async (req, res) => {
    try {
        const plans = await Plan.findAll({
            order: [['price', 'ASC']]
        });
        res.json(plans);
    } catch (err) {
        console.error("Fetch Plans Error:", err);
        res.status(500).json({ error: 'Server Error' });
    }
});

// GET Public Plans Only (for landing page pricing)
router.get('/public', async (req, res) => {
    try {
        const cached = _publicPlansCache.get();
        if (cached) return res.json(cached);

        const plans = await Plan.findAll({
            where: {
                isPublic: true,
                isActive: true
            },
            order: [['price', 'ASC']]
        });
        _publicPlansCache.set(plans);
        res.json(plans);
    } catch (err) {
        console.error("Fetch Public Plans Error:", err);
        res.status(500).json({ error: 'Server Error' });
    }
});

//GET Default Plan
router.get('/default', async (req, res) => {
    try {
        const defaultPlan = await Plan.findOne({
            where: { isDefault: true }
        });
        // Fallback if no default plan exists
        if (!defaultPlan) {
            return res.json({ name: 'Free', messageLimit: 30, contactLimit: 10, templateLimit: 2 });
        }
        res.json(defaultPlan);
    } catch (err) {
        console.error("Fetch Default Plan Error:", err);
        res.status(500).json({ error: 'Server Error' });
    }
});

const _metaRatesCache = cacheManager.createSimpleCache('meta_rates', 24 * 60 * 60 * 1000); // 24-hour TTL

/**
 * Persist admin-set rates to SystemConfig.settings so they survive
 * server restarts and are served consistently across all instances.
 */
async function persistMetaRates(rates) {
    try {
        const config = await SystemConfig.getConfig();
        const currentSettings = config.settings || {};
        await config.update({
            settings: {
                ...currentSettings,
                metaRatesCache: {
                    ...rates,
                    persistedAt: new Date().toISOString()
                }
            }
        });
    } catch (err) {
        console.warn('[META RATES] Could not persist rates to DB:', err.message);
    }
}

/**
 * Read the admin-set Meta rates from DB.
 * Returns null if no rates have been configured yet.
 */
async function getPersistedMetaRates() {
    try {
        const config = await SystemConfig.getConfig();
        return config.settings?.metaRatesCache || null;
    } catch (err) {
        console.warn('[META RATES] Could not read rates from DB:', err.message);
        return null;
    }
}

// GET /api/plans/meta-rates
// Returns WhatsApp per-message template rates (24h server-side cache).
// Rates are configured by the admin via POST /api/plans/meta-rates (auth required).
// Returns null if no rates have been configured yet — UI hides section.
router.get('/meta-rates', async (req, res) => {
    try {
        // Serve from 24h in-memory cache first
        const cached = _metaRatesCache.get();
        if (cached) return res.json(cached);

        // Read from DB (admin-configured)
        const rates = await getPersistedMetaRates();
        if (rates) {
            _metaRatesCache.set(rates);
            return res.json(rates);
        }

        // No rates configured yet — UI will hide the section
        return res.json(null);
    } catch (err) {
        console.error('[META RATES] Unexpected error:', err);
        res.json(null);
    }
});


// Protect all subsequent routes with Auth + Admin
router.use(auth, admin);

// POST /api/plans/meta-rates (Admin only)
// Set/update the WhatsApp per-message template rates shown on pricing cards.
// Admin looks up the official rates from Meta's pricing page and enters them here.
// Rates are stored in SystemConfig.settings.metaRatesCache and cached in-memory for 24h.
router.post('/meta-rates', async (req, res) => {
    try {
        const { marketing, utility, authentication, currency, symbol, country } = req.body;

        if (!marketing || !utility || !authentication) {
            return res.status(400).json({ error: 'marketing, utility, and authentication rates are required' });
        }

        const rates = {
            currency: currency || 'INR',
            symbol: symbol || '\u20B9',
            country: country || 'India',
            source: 'admin',
            updatedAt: new Date().toISOString(),
            rates: {
                marketing: String(marketing),
                utility: String(utility),
                authentication: String(authentication),
                service: 'Free'
            }
        };

        await persistMetaRates(rates);
        _metaRatesCache.set(rates); // Update in-memory cache immediately
        res.json({ success: true, rates });
    } catch (err) {
        console.error('[META RATES] Error saving rates:', err);
        res.status(500).json({ error: 'Server Error' });
    }
});

// POST Create Plan
router.post('/', async (req, res) => {
    try {
        const { 
            name, description, price, monthlyPrice, halfYearlyPrice, yearlyPrice, currency, interval, 
            features, color, isPopular, isActive, isDefault, isPublic, messageLimit, contactLimit, 
            templateLimit, aiTokensAllowance, includedAddons, teamMemberLimit, allowApiAccess, trialDays,
            quickReplyLimit, tagLimit, groupLimit, allowCtwaAnalytics, allowMetaAds,
            allowVcard, vcardLimit, coreFeatures, taxEnabled, taxText
        } = req.body;

        if (!name) return res.status(400).json({ error: 'Plan name is required' });

        const isDef = (isDefault === true || isDefault === 'true' || isDefault === 1 || isDefault === '1');
        // If setting as default, unset all other defaults first
        if (isDef) {
            await Plan.update(
                { isDefault: false },
                { where: { isDefault: true } }
            );
        }

        const plan = await Plan.create({
            name,
            description,
            price,
            monthlyPrice,
            halfYearlyPrice,
            yearlyPrice,
            currency,
            interval,
            messageLimit,
            contactLimit,
            templateLimit,
            quickReplyLimit: quickReplyLimit || 10,
            tagLimit: tagLimit || 10,
            groupLimit: groupLimit || 5,
            teamMemberLimit: teamMemberLimit || 0,
            aiTokensAllowance: aiTokensAllowance || 0,
            includedAddons: includedAddons || [],
            trialDays: trialDays || 0,
            features,
            coreFeatures: coreFeatures || [],
            color,
            isPopular,
            isActive,
            allowApiAccess: allowApiAccess || false,
            allowCtwaAnalytics: allowCtwaAnalytics || false,
            allowMetaAds: allowMetaAds || false,
            allowVcard: allowVcard || false,
            vcardLimit: vcardLimit || 0,
            isDefault: isDefault || false,
            isPublic: isPublic !== undefined ? isPublic : true,
            taxEnabled: taxEnabled || false,
            taxText: taxText || 'excluding 18% GST'
        });

        // Sync core features across all plans
        if (coreFeatures && Array.isArray(coreFeatures)) {
            const newFeatures = coreFeatures.map(f => f.name).filter(name => name && name.trim() !== '');
            if (newFeatures.length > 0) {
                const otherPlans = await Plan.findAll({ where: { id: { [Op.ne]: plan.id } } });
                for (let otherPlan of otherPlans) {
                    let otherFeatures = [...(otherPlan.coreFeatures || [])];
                    let modified = false;
                    for (let featureName of newFeatures) {
                        if (!otherFeatures.find(f => f.name === featureName)) {
                            otherFeatures.push({ name: featureName, qty: '' });
                            modified = true;
                        }
                    }
                    if (modified) {
                        await otherPlan.update({ coreFeatures: otherFeatures });
                    }
                }
            }
        }

        // Invalidate public plans cache
        cacheManager.invalidate('public_plans');

        // Log Activity
        await logActivity(req, 'Plan Created', `Admin created plan: ${name} (${price} ${currency})${isDefault ? ' [DEFAULT]' : ''}`);

        res.json(plan);
    } catch (err) {
        console.error("Create Plan Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// PUT Update Plan
router.put('/:id', async (req, res) => {
    try {
        const plan = await Plan.findByPk(req.params.id);
        if (!plan) return res.status(404).json({ error: 'Plan not found' });

        const isDefUpdate = (req.body.isDefault === true || req.body.isDefault === 'true' || req.body.isDefault === 1 || req.body.isDefault === '1');
        // If setting as default, unset all other defaults first
        if (isDefUpdate) {
            await Plan.update(
                { isDefault: false },
                { where: { isDefault: true, id: { [Op.ne]: req.params.id } } }
            );
        }

        const updates = { ...req.body };
        delete updates.id;
        delete updates.createdAt;
        delete updates.updatedAt;
        await plan.update(updates);

        // Sync core features across all plans
        if (req.body.coreFeatures && Array.isArray(req.body.coreFeatures)) {
            const newFeatures = req.body.coreFeatures.map(f => f.name).filter(name => name && name.trim() !== '');
            if (newFeatures.length > 0) {
                const otherPlans = await Plan.findAll({ where: { id: { [Op.ne]: plan.id } } });
                for (let otherPlan of otherPlans) {
                    let otherFeatures = [...(otherPlan.coreFeatures || [])];
                    let modified = false;
                    for (let featureName of newFeatures) {
                        if (!otherFeatures.find(f => f.name === featureName)) {
                            otherFeatures.push({ name: featureName, qty: '' });
                            modified = true;
                        }
                    }
                    if (modified) {
                        await otherPlan.update({ coreFeatures: otherFeatures });
                    }
                }
            }
        }

        // Invalidate public plans cache
        cacheManager.invalidate('public_plans');

        // Log Activity
        await logActivity(req, 'Plan Updated', `Admin updated plan: ${plan.name}${plan.isDefault ? ' [DEFAULT]' : ''}`);

        res.json(plan);
    } catch (err) {
        console.error("Update Plan Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// DELETE Plan
router.delete('/:id', async (req, res) => {
    try {
        const plan = await Plan.findByPk(req.params.id);
        if (!plan) return res.status(404).json({ error: 'Plan not found' });

        const name = plan.name;
        await plan.destroy();

        // Invalidate public plans cache
        cacheManager.invalidate('public_plans');

        // Log Activity
        await logActivity(req, 'Plan Deleted', `Admin deleted plan: ${name}`);

        res.json({ message: 'Plan deleted' });
    } catch (err) {
        console.error("Delete Plan Error:", err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
