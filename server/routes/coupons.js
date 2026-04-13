const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const auth = require('../middleware/auth');
const Coupon = require('../models/Coupon');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

// Custom Admin Middleware for Coupons
const checkAdmin = async (req, res, next) => {
    try {
        const user = await User.findByPk(req.user.id);
        if (!user || !user.isAdmin) {
            return res.status(403).json({ error: 'Access Denied: Superadmin only.' });
        }
        next();
    } catch (err) {
        res.status(500).json({ error: 'Server error verifying admin status.' });
    }
};

router.use(auth); // Protect all routes

// ==========================================
// ADMIN ROUTES
// ==========================================

// GET all coupons
router.get('/', checkAdmin, async (req, res) => {
    try {
        const coupons = await Coupon.findAll({ order: [['createdAt', 'DESC']] });
        res.json(coupons);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// CREATE a new coupon
router.post('/', checkAdmin, async (req, res) => {
    try {
        const newCoupon = await Coupon.create(req.body);
        res.status(201).json(newCoupon);
    } catch (err) {
        if (err.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ error: 'Coupon code already exists.' });
        }
        res.status(400).json({ error: err.message });
    }
});

// UPDATE a coupon
router.put('/:id', checkAdmin, async (req, res) => {
    try {
        const coupon = await Coupon.findByPk(req.params.id);
        if (!coupon) return res.status(404).json({ error: 'Coupon not found.' });

        await coupon.update(req.body);
        res.json(coupon);
    } catch (err) {
        if (err.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ error: 'Coupon code already exists.' });
        }
        res.status(400).json({ error: err.message });
    }
});

// DELETE a coupon
router.delete('/:id', checkAdmin, async (req, res) => {
    try {
        const coupon = await Coupon.findByPk(req.params.id);
        if (!coupon) return res.status(404).json({ error: 'Coupon not found.' });

        await coupon.destroy();
        res.json({ message: 'Coupon deleted successfully.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// USER ROUTES
// ==========================================

// VALIDATE a coupon before purchase
router.post('/validate', async (req, res) => {
    try {
        const { code, planName, planPrice, isUpgrade, interval } = req.body;
        if (!code) return res.status(400).json({ error: 'Coupon code is required.' });

        const coupon = await Coupon.findOne({ where: { code: code.toUpperCase() } });

        if (!coupon) {
            return res.status(404).json({ error: 'Invalid coupon code.' });
        }
        if (!coupon.isActive) {
            return res.status(400).json({ error: 'This coupon is no longer active.' });
        }

        // Check Upgrades
        if (isUpgrade && !coupon.isValidForUpgrades) {
            return res.status(400).json({ error: 'This coupon cannot be used during plan upgrades.' });
        }

        // 1. Check Dates
        const now = new Date();
        if (coupon.startDate && new Date(coupon.startDate) > now) {
            return res.status(400).json({ error: 'This coupon is not yet valid.' });
        }
        if (coupon.expiryDate && new Date(coupon.expiryDate) < now) {
            return res.status(400).json({ error: 'This coupon has expired.' });
        }

        // 2. Check Global Max Uses
        if (coupon.maxUses > 0 && coupon.usesCount >= coupon.maxUses) {
            return res.status(400).json({ error: 'This coupon has reached its maximum usage limit.' });
        }

        // 3. Check Applicable Plans
        if (coupon.applicablePlans && coupon.applicablePlans.length > 0) {
            if (!coupon.applicablePlans.includes(planName)) {
                return res.status(400).json({ error: `This coupon is not valid for the ${planName} plan.` });
            }
        }

        // 4. Check Minimum Purchase Amount
        if (coupon.minPurchaseAmount > 0 && parseFloat(planPrice) < coupon.minPurchaseAmount) {
            return res.status(400).json({ error: `Minimum purchase amount of ${coupon.minPurchaseAmount} required for this coupon.` });
        }

        // 5. Check Per-User Limit
        if (coupon.userLimit > 0) {
            const userUsageCount = await Transaction.count({
                where: {
                    userId: req.user.id,
                    couponCode: coupon.code,
                    status: 'COMPLETED'
                }
            });
            if (userUsageCount >= coupon.userLimit) {
                return res.status(400).json({ error: `You have reached the maximum allowed uses (${coupon.userLimit}) for this coupon.` });
            }
        }

        // --- v2 Advanced Constraints ---

        // 6. Check First Purchase Only
        if (coupon.isFirstPurchaseOnly) {
            const anyPastTxn = await Transaction.count({
                where: { userId: req.user.id, status: 'COMPLETED' }
            });
            if (anyPastTxn > 0) {
                return res.status(400).json({ error: 'This coupon is only valid for first-time purchases.' });
            }
        }

        // 7. Check Valid Intervals
        if (coupon.validIntervals && coupon.validIntervals.length > 0) {
            if (!interval || !coupon.validIntervals.includes(interval)) {
                return res.status(400).json({ error: `This coupon is not valid for ${interval} billing.` });
            }
        }

        // 8. Check Allowed Emails/Domains
        if (coupon.allowedEmails && coupon.allowedEmails.length > 0) {
            const userEmail = req.user.email.toLowerCase();
            const isMatch = coupon.allowedEmails.some(allowed => {
                const term = allowed.toLowerCase().trim();
                return term.startsWith('@') ? userEmail.endsWith(term) : userEmail === term;
            });

            if (!isMatch) {
                return res.status(400).json({ error: 'This coupon is not valid for your account.' });
            }
        }

        // Calculate Discount Value for Frontend Preview
        let finalPrice = parseFloat(planPrice);
        let discountAmount = 0;

        if (coupon.discountType === 'percentage') {
            discountAmount = finalPrice * (coupon.discountValue / 100);

            // 9. Apply Max Discount Cap
            if (coupon.maxDiscountCap && coupon.maxDiscountCap > 0 && discountAmount > coupon.maxDiscountCap) {
                discountAmount = coupon.maxDiscountCap;
            }
        } else if (coupon.discountType === 'fixed') {
            discountAmount = coupon.discountValue;
        }

        if (discountAmount > finalPrice) {
            discountAmount = finalPrice; // Can't discount more than the total
        }

        finalPrice = finalPrice - discountAmount;

        res.json({
            message: 'Coupon applied successfully!',
            code: coupon.code,
            discountType: coupon.discountType,
            discountValue: coupon.discountValue,
            calculatedDiscount: discountAmount,
            finalPrice
        });

    } catch (err) {
        console.error('Coupon Validation Error:', err);
        res.status(500).json({ error: 'Failed to validate coupon.' });
    }
});

module.exports = router;
