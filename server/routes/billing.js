const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { Op } = require('sequelize');
const auth = require('../middleware/auth');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const MessageLog = require('../models/MessageLog');
const Plan = require('../models/Plan');
const Settings = require('../models/Settings');

router.use(auth);

// ─── Helper: get Razorpay instance from admin Settings ────────────────────────
const getRazorpay = async () => {
    const Razorpay = require('razorpay');

    // Strategy 1: find the admin user and use their settings
    let keyId, keySecret;
    try {
        const adminUser = await User.findOne({ where: { isAdmin: true }, order: [['createdAt', 'ASC']] });
        if (adminUser) {
            const settings = await Settings.findOne({ where: { userId: adminUser.id } });
            const gateways = settings?.paymentGateways || {};
            keyId = gateways.razorpay?.keyId;
            keySecret = gateways.razorpay?.keySecret;
        }
    } catch (e) {
        console.error('Settings lookup error:', e.message);
    }

    // Strategy 2: fall back to env vars
    keyId = keyId || process.env.RAZORPAY_KEY_ID;
    keySecret = keySecret || process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
        throw new Error('Razorpay keys not configured. Please go to Settings → Payment Gateways and enter your Razorpay Key ID and Secret.');
    }

    return { instance: new Razorpay({ key_id: keyId, key_secret: keySecret }), keyId };
};

// ─── Helper: compute plan expiry Date based on interval ───────────────────────
const computePlanExpiry = (interval) => {
    if (interval === 'month') {
        const d = new Date();
        d.setMonth(d.getMonth() + 1);
        return d;
    }
    if (interval === 'year') {
        const d = new Date();
        d.setFullYear(d.getFullYear() + 1);
        return d;
    }
    return null; // lifetime → no expiry
};

// ─── Helper: apply upgrade to user + record transaction ───────────────────────
const applyUpgrade = async (userId, targetPlan, extraTxnFields = {}) => {
    const user = await User.findByPk(userId);
    const amount = parseFloat(targetPlan.price);
    await Transaction.create({
        userId,
        amount,
        currency: targetPlan.currency || 'INR',
        planName: targetPlan.name,
        status: 'COMPLETED',
        ...extraTxnFields
    });
    await user.update({
        plan: targetPlan.name,
        planStatus: 'Active',
        planExpiry: computePlanExpiry(targetPlan.interval)
    });
};

// ─── Helper: calculate upgrade discount ─────────────────────────────────────
const calculateUpgradeDiscount = async (user, targetPlan) => {
    // If no active paid plan or no expiry date, no credit
    if (!user.planExpiry || user.plan === 'Free' || user.planStatus !== 'Active') {
        return { creditAmount: 0, finalPrice: parseFloat(targetPlan.price), remainingDays: 0, currentPlanName: user.plan };
    }

    const currentPlan = await Plan.findOne({ where: { name: user.plan } });
    if (!currentPlan || parseFloat(currentPlan.price) <= 0) {
        return { creditAmount: 0, finalPrice: parseFloat(targetPlan.price), remainingDays: 0, currentPlanName: user.plan };
    }

    const now = new Date();
    const expiry = new Date(user.planExpiry);

    if (expiry <= now) {
        return { creditAmount: 0, finalPrice: parseFloat(targetPlan.price), remainingDays: 0, currentPlanName: user.plan };
    }

    // Determine total days in current billing cycle
    let totalDays = currentPlan.interval === 'year' ? 365 : 30; // estimate

    const dailyRate = parseFloat(currentPlan.price) / totalDays;

    // Remaining Days
    const remainingMs = expiry - now;
    const remainingDays = Math.ceil(remainingMs / (1000 * 60 * 60 * 24));

    let creditAmount = dailyRate * remainingDays;

    // Prevent credit from being larger than the target plan (no negative balances)
    let finalPrice = parseFloat(targetPlan.price) - creditAmount;
    if (finalPrice < 0) {
        creditAmount = parseFloat(targetPlan.price); // Cap credit
        finalPrice = 0;
    }

    return {
        creditAmount: Math.round(creditAmount * 100) / 100,
        finalPrice: Math.round(finalPrice * 100) / 100,
        remainingDays,
        currentPlanName: currentPlan.name
    };
};

// GET All Public Plans (for upgrade selection)
router.get('/plans', async (req, res) => {
    try {
        const plans = await Plan.findAll({
            where: { isPublic: true, isActive: true },
            order: [['price', 'ASC']]
        });
        res.json(plans);
    } catch (err) {
        console.error('Plans Fetch Error:', err);
        res.status(500).json({ error: err.message });
    }
});

router.get('/', async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);

        // Calculate Month Range
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        // Usage Stats
        const messagesSent = await MessageLog.count({
            where: {
                createdAt: {
                    [Op.between]: [startOfMonth, endOfMonth]
                },
                status: { [Op.ne]: 'FAILED' } // Consistent with Dashboard Logic
            },
            include: [{
                model: require('../models/Message'),
                where: { userId: req.user.id },
                attributes: []
            }]
        });

        // Fetch Plan Details from DB
        const planName = user.plan || 'Free';
        const planDetails = await Plan.findOne({ where: { name: planName } });

        // Defaults if plan missing (fallback safeties)
        let monthlyLimit = planDetails ? planDetails.messageLimit : 30;
        let templateLimit = planDetails ? planDetails.templateLimit : 2;
        let contactLimit = planDetails ? planDetails.contactLimit : 10;
        let planPrice = planDetails ? parseFloat(planDetails.price) : 0;

        // Count current templates and contacts
        const Template = require('../models/Template');
        const Contact = require('../models/Contact');
        const [templateCount, contactCount] = await Promise.all([
            Template.count({ where: { userId: req.user.id } }),
            Contact.count({ where: { userId: req.user.id } })
        ]);

        res.json({
            plan: {
                name: planName,
                status: user.planStatus || 'Active',
                expiry: user.planExpiry,
                price: planPrice,
                currency: planDetails ? planDetails.currency : 'USD',
                interval: planDetails ? planDetails.interval : 'month'  // month | year | lifetime
            },
            usage: {
                messagesSent,
                monthlyLimit,
                templateLimit,
                contactLimit,
                templateCount,
                contactCount,
                periodStart: startOfMonth,
                periodEnd: endOfMonth
            }
        });

    } catch (err) {
        console.error("Billing Info Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// GET Invoices
router.get('/invoices', async (req, res) => {
    try {
        const transactions = await Transaction.findAll({
            where: { userId: req.user.id },
            order: [['createdAt', 'DESC']]
        });
        res.json(transactions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /calculate-upgrade/:planName
router.get('/calculate-upgrade/:planName', async (req, res) => {
    try {
        const { planName } = req.params;
        const targetPlan = await Plan.findOne({ where: { name: planName } });
        if (!targetPlan) return res.status(404).json({ error: `Plan '${planName}' not found.` });

        const user = await User.findByPk(req.user.id);
        const { creditAmount, finalPrice, remainingDays, currentPlanName } = await calculateUpgradeDiscount(user, targetPlan);

        res.json({
            targetPlanPrice: parseFloat(targetPlan.price),
            creditAmount,
            finalPayableAmount: finalPrice,
            remainingDays,
            currentPlanName,
            targetPlanName: targetPlan.name
        });
    } catch (err) {
        console.error('Calculate Upgrade Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ─── POST /create-order ── Step 1 of Razorpay checkout ───────────────────────
router.post('/create-order', async (req, res) => {
    try {
        const { planName, isUpgrade } = req.body;
        const targetPlan = await Plan.findOne({ where: { name: planName } });
        if (!targetPlan) return res.status(404).json({ error: `Plan '${planName}' not found.` });

        const { instance, keyId } = await getRazorpay();
        const user = await User.findByPk(req.user.id);

        let finalPriceToCharge = parseFloat(targetPlan.price);

        // If it's an upgrade, apply backend calculation to ensure exact matched amounts
        if (isUpgrade && user.planStatus === 'Active' && user.planExpiry && user.plan !== 'Free') {
            const math = await calculateUpgradeDiscount(user, targetPlan);
            finalPriceToCharge = math.finalPrice;
        }

        // Razorpay amount is always in smallest currency unit (paisa for INR, cents for USD)
        const amountInSmallestUnit = Math.round(finalPriceToCharge * 100);

        const order = await instance.orders.create({
            amount: amountInSmallestUnit,
            currency: targetPlan.currency || 'INR',
            receipt: `receipt_${Date.now()}`,
            notes: { planName, userId: req.user.id }
        });

        res.json({
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            keyId,
            planName,
            userName: user.name,
            userEmail: user.email
        });
    } catch (err) {
        console.error('Razorpay Create Order Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ─── POST /verify-payment ── Step 2: verify signature then upgrade ────────────
router.post('/verify-payment', async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planName } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !planName) {
            return res.status(400).json({ error: 'Missing payment verification fields.' });
        }

        // 1. Get secret key for signature verification (from admin's Settings)
        let keySecret;
        try {
            const adminUser = await User.findOne({ where: { isAdmin: true }, order: [['createdAt', 'ASC']] });
            if (adminUser) {
                const settings = await Settings.findOne({ where: { userId: adminUser.id } });
                keySecret = settings?.paymentGateways?.razorpay?.keySecret;
            }
        } catch (e) {
            console.error('Settings lookup error:', e.message);
        }
        keySecret = keySecret || process.env.RAZORPAY_KEY_SECRET;
        if (!keySecret) return res.status(500).json({ error: 'Razorpay secret key not configured.' });

        // 2. Verify HMAC SHA256 signature
        const expectedSignature = crypto
            .createHmac('sha256', keySecret)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest('hex');

        if (expectedSignature !== razorpay_signature) {
            console.error('Razorpay signature mismatch');
            return res.status(400).json({ error: 'Payment verification failed. Invalid signature.' });
        }

        // 3. Signature valid → apply upgrade
        const targetPlan = await Plan.findOne({ where: { name: planName } });
        if (!targetPlan) return res.status(404).json({ error: `Plan '${planName}' not found.` });

        await applyUpgrade(req.user.id, targetPlan, {
            razorpayOrderId: razorpay_order_id,
            razorpayPaymentId: razorpay_payment_id
        });

        res.json({ success: true, message: `Successfully upgraded to ${planName}` });
    } catch (err) {
        console.error('Razorpay Verify Payment Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// POST /upgrade — legacy / fallback (keeps backward compatibility)
// Does NOT verify payment — use /verify-payment for real Razorpay flows
router.post('/upgrade', async (req, res) => {
    try {
        const { planName } = req.body;
        const targetPlan = await Plan.findOne({ where: { name: planName } });
        if (!targetPlan) return res.status(404).json({ error: `Plan '${planName}' not found.` });
        await applyUpgrade(req.user.id, targetPlan);
        res.json({ success: true, message: `Upgraded to ${planName}` });
    } catch (err) {
        console.error('Upgrade Error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
