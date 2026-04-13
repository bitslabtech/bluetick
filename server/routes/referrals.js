const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const ReferralReward = require('../models/ReferralReward');
const SystemConfig = require('../models/SystemConfig');

// GET /api/referrals/stats
router.get('/stats', auth, async (req, res) => {
    try {
        const userId = req.user.realId || req.user.id;
        
        // 1. Get user to find their referral code
        const user = await User.findByPk(userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        if (!user.referralCode) {
            const crypto = require('crypto');
            user.referralCode = crypto.randomBytes(4).toString('hex').toUpperCase();
            await user.save();
        }

        // 2. Get all users who they referred
        const referredUsers = await User.findAll({
            where: { referredBy: userId },
            attributes: ['id', 'name', 'email', 'createdAt']
        });

        // 3. Get all rewards they have earned
        const rewards = await ReferralReward.findAll({
            where: { referrerId: userId }
        });

        // 4. Map statuses
        // A user is "pending" if they exist in referredUsers but there is NO corresponding reward log for them.
        // A user is "paid" if there is a reward log for them.
        const referralStats = referredUsers.map(refUser => {
            const hasPurchased = rewards.some(r => r.referredUserId === refUser.id);
            return {
                id: refUser.id,
                name: refUser.name,
                email: refUser.email,
                joinedAt: refUser.createdAt,
                status: hasPurchased ? 'Converted' : 'Pending'
            };
        });

        // 5. Calculate total earnings (this requires parsing the JSON rewardLog if needed, 
        // but for now we can just return the raw logs to the frontend, or aggregate)
        let totalMonthsEarned = 0;
        rewards.forEach(r => {
            if (r.rewardLog && Array.isArray(r.rewardLog.referrerRewards)) {
                r.rewardLog.referrerRewards.forEach(reward => {
                    if (reward.type === 'validity_months') totalMonthsEarned += reward.value;
                });
            }
        });

        // 6. Provide the active rules so UI knows what to advertise
        const config = await SystemConfig.getCachedConfig();
        const activeRules = config.settings?.referralRules || null;

        res.json({
            referralCode: user.referralCode,
            activeRules,
            stats: referralStats,
            totals: {
                totalInvited: referredUsers.length,
                totalConverted: rewards.length,
                totalMonthsEarned
            }
        });
    } catch (error) {
        console.error('[REFERRALS STATS]', error);
        res.status(500).json({ error: 'Failed to fetch referral stats' });
    }
});


// POST /api/referrals/apply-partner
// Allows an eligible user to apply for Tech Partner status
router.post('/apply-partner', auth, async (req, res) => {
    try {
        const userId = req.user.realId || req.user.id;
        const user = await User.findByPk(userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        // Already a partner or pending
        if (user.techPartnerStatus === 'approved') {
            return res.status(400).json({ error: 'You are already an approved Tech Partner.' });
        }
        if (user.techPartnerStatus === 'pending') {
            return res.status(400).json({ error: 'Your application is already under review.' });
        }

        // Check system config for eligibility rules
        const config = await SystemConfig.getCachedConfig();
        const tpConfig = config.settings?.techPartnerProgram || {};

        if (!tpConfig.enabled) {
            return res.status(403).json({ error: 'The Tech Partner program is currently disabled.' });
        }

        // Eligibility: must have purchased a yearly plan (if requiresYearlyPlan is true)
        if (tpConfig.requiresYearlyPlan !== false) {
            const Transaction = require('../models/Transaction');
            const Plan = require('../models/Plan');

            const yearlyPlans = await Plan.findAll({ where: { interval: 'year' } });
            const yearlyPlanNames = yearlyPlans.map(p => p.name);

            const hasYearlyPurchase = await Transaction.count({
                where: {
                    userId,
                    status: 'COMPLETED',
                    planName: yearlyPlanNames.length > 0 ? yearlyPlanNames : ['__none__']
                }
            });

            if (!hasYearlyPurchase) {
                return res.status(403).json({
                    error: 'Eligibility requirement not met. You must have purchased at least one annual plan to apply for Tech Partner status.'
                });
            }
        }

        user.techPartnerStatus = 'pending';
        await user.save();

        res.json({ success: true, message: 'Your Tech Partner application has been submitted. We will review it shortly.' });
    } catch (error) {
        console.error('[TECH PARTNER APPLY]', error);
        res.status(500).json({ error: 'Failed to submit application.' });
    }
});

// GET /api/referrals/tech-partner
// Returns earnings, balance, and payout history for an approved Tech Partner
router.get('/tech-partner', auth, async (req, res) => {
    try {
        const userId = req.user.realId || req.user.id;
        const user = await User.findByPk(userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        if (user.techPartnerStatus !== 'approved') {
            return res.status(403).json({ error: 'Access denied. You are not an approved Tech Partner.' });
        }

        const TechPartnerEarning = require('../models/TechPartnerEarning');
        const config = await SystemConfig.getCachedConfig();
        const tpConfig = config.settings?.techPartnerProgram || {};

        // Fetch all earning records
        const earnings = await TechPartnerEarning.findAll({
            where: { referrerId: userId },
            order: [['createdAt', 'DESC']]
        });

        // Aggregate stats
        const totalEarned = earnings.reduce((sum, e) => sum + (e.commissionAmount || 0), 0);
        const totalPaid = earnings.filter(e => e.status === 'paid').reduce((sum, e) => sum + e.commissionAmount, 0);
        const totalPending = earnings.filter(e => e.status === 'pending').reduce((sum, e) => sum + e.commissionAmount, 0);

        // Count referred users
        const referredUsers = await User.findAll({
            where: { referredBy: userId },
            attributes: ['id', 'name', 'email', 'createdAt']
        });

        res.json({
            techPartnerStatus: user.techPartnerStatus,
            techPartnerBalance: user.techPartnerBalance || 0,
            minPayoutBalance: tpConfig.minPayoutBalance || 10000,
            commissionRate: tpConfig.commissionRate || 20,
            stats: {
                totalEarned: Math.round(totalEarned * 100) / 100,
                totalPaid: Math.round(totalPaid * 100) / 100,
                totalPending: Math.round(totalPending * 100) / 100,
                totalReferrals: referredUsers.length
            },
            earnings: earnings.map(e => ({
                id: e.id,
                planName: e.planName,
                planPrice: e.planPrice,
                commissionRate: e.commissionRate,
                commissionAmount: e.commissionAmount,
                currency: e.currency,
                status: e.status,
                paidAt: e.paidAt,
                createdAt: e.createdAt
            }))
        });
    } catch (error) {
        console.error('[TECH PARTNER DASHBOARD]', error);
        res.status(500).json({ error: 'Failed to fetch tech partner data.' });
    }
});

module.exports = router;

