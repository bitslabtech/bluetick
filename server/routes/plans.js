const express = require('express');
const router = express.Router();
const Plan = require('../models/Plan');
const { Op } = require('sequelize');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const logActivity = require('../utils/logger');
const cacheManager = require('../utils/cacheManager');
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

// Protect all subsequent routes with Auth + Admin
router.use(auth, admin);

// POST Create Plan
router.post('/', async (req, res) => {
    try {
        const { 
            name, description, price, monthlyPrice, halfYearlyPrice, yearlyPrice, currency, interval, 
            features, color, isPopular, isActive, isDefault, isPublic, messageLimit, contactLimit, 
            templateLimit, aiTokensAllowance, includedAddons, teamMemberLimit, allowApiAccess, trialDays,
            quickReplyLimit, tagLimit, groupLimit, allowCtwaAnalytics, allowMetaAds,
            allowVcard, vcardLimit, coreFeatures
        } = req.body;

        if (!name) return res.status(400).json({ error: 'Plan name is required' });

        // If setting as default, unset all other defaults first
        if (isDefault === true) {
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
            isPublic: isPublic !== undefined ? isPublic : true
        });

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

        // If setting as default, unset all other defaults first
        if (req.body.isDefault === true) {
            await Plan.update(
                { isDefault: false },
                { where: { isDefault: true, id: { [Op.ne]: req.params.id } } }
            );
        }

        await plan.update(req.body);

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
