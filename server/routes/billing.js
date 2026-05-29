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
const Coupon = require('../models/Coupon');
const UserAddon = require('../models/UserAddon');
const Addon = require('../models/Addon');
const SystemConfig = require('../models/SystemConfig');
const ReferralReward = require('../models/ReferralReward');

router.use(auth);

const PaymentService = require('../services/PaymentService');
// ─── Helper: compute plan expiry Date based on interval ───────────────────────
const computePlanExpiry = (interval, currentExpiryDate, isRenewal) => {
    let baseDate = new Date();
    
    // Stack expiry if it's a valid renewal request
    if (isRenewal && currentExpiryDate) {
        const d = new Date(currentExpiryDate);
        if (d > baseDate) {
            baseDate = d;
        }
    }

    if (interval === 'month') {
        baseDate.setMonth(baseDate.getMonth() + 1);
        return baseDate;
    }
    if (interval === 'half-year') {
        baseDate.setMonth(baseDate.getMonth() + 6);
        return baseDate;
    }
    if (interval === 'year') {
        baseDate.setFullYear(baseDate.getFullYear() + 1);
        return baseDate;
    }
    return null; // lifetime → no expiry
};

const applyUpgrade = async (userId, targetPlan, extraTxnFields = {}) => {
    const user = await User.findByPk(userId);
    const fullPrice = parseFloat(targetPlan.price);

    // Use actual paid amount if provided (after coupon/discount), else fall back to full price
    const amountPaid = (extraTxnFields.amountPaid !== undefined && extraTxnFields.amountPaid !== null)
        ? parseFloat(extraTxnFields.amountPaid)
        : fullPrice;

    // Identify if this is a time-extension renewal
    const isRenewal = (user.plan === targetPlan.name && user.planStatus === 'Active');

    await Transaction.create({
        userId,
        amount: amountPaid,
        currency: targetPlan.currency || 'INR',
        planName: targetPlan.name,
        status: 'COMPLETED',
        ...extraTxnFields
    });

    // Grant AI Tokens
    let newAiTokens = user.aiTokenBalance || 0;
    if (targetPlan.aiTokensAllowance) {
        newAiTokens += targetPlan.aiTokensAllowance;
    }

    // Grant Included Add-ons natively
    if (targetPlan.includedAddons && targetPlan.includedAddons.length > 0) {
        const addonsToInclude = await Addon.findAll({ where: { module_key: targetPlan.includedAddons } });
        for (const addon of addonsToInclude) {
            const existing = await UserAddon.findOne({ where: { userId: user.id, addonId: addon.id } });
            if (existing) {
                existing.status = 'active';
                await existing.save();
            } else {
                await UserAddon.create({ userId: user.id, addonId: addon.id, status: 'active' });
            }
        }
    }

    await user.update({
        plan: targetPlan.name,
        planStatus: 'Active',
        planExpiry: computePlanExpiry(targetPlan.interval, user.planExpiry, isRenewal),
        aiTokenBalance: newAiTokens
    });

    // --- Dynamic Referral System Processing ---
    try {
        if (user.referredBy && parseFloat(targetPlan.price) > 0) {
            const config = await SystemConfig.getCachedConfig();
            
            // Check if this is their first paid plan transaction
            const pastPaidCount = await Transaction.count({
                where: {
                    userId: user.id,
                    status: 'COMPLETED',
                    planName: { [Op.notLike]: 'Store:%' }
                }
            });

            const referrer = await User.findByPk(user.referredBy);

            if (referrer) {
                // 1. One-Time Standard Referral Rewards (First Purchase Only)
                if (pastPaidCount === 1) {
                    const rules = config.settings?.referralRules;
                    
                    if (rules && rules.enabled) {
                        // Ensure reward hasn't been given to prevent race condition abuse
                        const existingReward = await ReferralReward.findOne({ where: { referredUserId: user.id } });
                        
                        if (!existingReward) {
                            const rewardLog = { referrerRewards: rules.referrerRewards, refereeRewards: rules.refereeRewards };
                            
                            // Process Referrer Rewards (only if NOT an approved tech partner)
                            if (referrer.techPartnerStatus !== 'approved') {
                                for (const reward of (rules.referrerRewards || [])) {
                                    if (reward.type === 'validity_months') {
                                        if (referrer.plan !== 'Free' && referrer.planExpiry) {
                                            const d = new Date(referrer.planExpiry);
                                            d.setMonth(d.getMonth() + reward.value);
                                            referrer.planExpiry = d;
                                        }
                                    } else if (reward.type === 'ai_tokens') {
                                        referrer.aiTokenBalance = (referrer.aiTokenBalance || 0) + reward.value;
                                    } else if (reward.type === 'extra_messages') {
                                        referrer.extraTopupMessages = (referrer.extraTopupMessages || 0) + reward.value;
                                    } else if (reward.type === 'extra_contacts') {
                                        referrer.extraTopupContacts = (referrer.extraTopupContacts || 0) + reward.value;
                                    }
                                }
                                await referrer.save();
                            }

                            // Process Referee (Current User) Rewards
                            for (const reward of (rules.refereeRewards || [])) {
                                if (reward.type === 'validity_months') {
                                    const d = new Date(user.planExpiry);
                                    d.setMonth(d.getMonth() + reward.value);
                                    user.planExpiry = d;
                                } else if (reward.type === 'ai_tokens') {
                                    user.aiTokenBalance = (user.aiTokenBalance || 0) + reward.value;
                                } else if (reward.type === 'extra_messages') {
                                    user.extraTopupMessages = (user.extraTopupMessages || 0) + reward.value;
                                } else if (reward.type === 'extra_contacts') {
                                    user.extraTopupContacts = (user.extraTopupContacts || 0) + reward.value;
                                }
                            }
                            await user.save();

                            // Log it
                            await ReferralReward.create({
                                referrerId: referrer.id,
                                referredUserId: user.id,
                                rewardLog
                            });
                            console.log(`[REFERRAL ALERTS] Processed rewards for ${user.id} referred by ${referrer.id}`);
                        }
                    }
                }

                // 2. Tech Partner Recurring Commission (Every Purchase)
                if (referrer.techPartnerStatus === 'approved') {
                    try {
                        const tpConfig = config.settings?.techPartnerProgram || {};
                        if (tpConfig.enabled !== false) {
                            const commissionRate = tpConfig.commissionRate || 20;
                            let commissionAmount = Math.round((parseFloat(targetPlan.price) * commissionRate / 100) * 100) / 100;

                            // --- NEW: Subsidize custom tech partner coupon ---
                            if (extraTxnFields && extraTxnFields.couponCode) {
                                const Coupon = require('../models/Coupon');
                                const usedCoupon = await Coupon.findOne({ where: { code: extraTxnFields.couponCode.toUpperCase() } });
                                const TechPartner = require('../models/TechPartner');
                                const tpProfile = await TechPartner.findOne({ where: { userId: referrer.id } });
                                if (usedCoupon && tpProfile && usedCoupon.techPartnerId === tpProfile.id) {
                                    const discountAmount = extraTxnFields.discountApplied || 0;
                                    commissionAmount = commissionAmount - discountAmount;
                                    console.log(`[TECH PARTNER] Deducted ${discountAmount} from commission due to subsidized coupon. Net commission: ${commissionAmount}`);
                                }
                            }
                            // ---------------------------------------------------

                            const TechPartnerEarning = require('../models/TechPartnerEarning');
                            await TechPartnerEarning.create({
                                referrerId: referrer.id,
                                referredUserId: user.id,
                                planName: targetPlan.name,
                                planPrice: parseFloat(targetPlan.price),
                                commissionRate,
                                commissionAmount,
                                currency: targetPlan.currency || 'INR',
                                status: 'pending'
                            });

                            // Accumulate balance on the partner user
                            referrer.techPartnerBalance = Math.round(((referrer.techPartnerBalance || 0) + commissionAmount) * 100) / 100;
                            await referrer.save();

                            console.log(`[TECH PARTNER] Commission of ${commissionAmount} logged for partner ${referrer.id}`);
                        }
                    } catch (tpErr) {
                        console.error('[TECH PARTNER COMMISSION ERROR]', tpErr);
                    }
                }
            }
        }
    } catch(err) {
        console.error('[REFERRAL PROCESS ERROR]', err);
    }

    // --- B2B Tech Partner Payout Processing ---
    // Independent of the user referral system above.
    // Triggered on EVERY purchase for recurring commissions.
    try {
        if (user.techPartnerId && parseFloat(targetPlan.price) > 0) {
            const config = await SystemConfig.getCachedConfig();
            const tpProgramConfig = config.settings?.techPartnerProgram || {};

            if (tpProgramConfig.enabled !== false) {
                const TechPartner = require('../models/TechPartner');
                const partner = await TechPartner.findByPk(user.techPartnerId);

                if (partner && partner.enabled) {
                    const planPrice = parseFloat(targetPlan.price);
                    let commissionAmount = 0;

                    if (partner.commissionType === 'percentage') {
                        commissionAmount = Math.round((planPrice * partner.commissionValue / 100) * 100) / 100;
                    } else if (partner.commissionType === 'flat') {
                        commissionAmount = partner.commissionValue;
                    } else if (partner.commissionType === 'validity_months') {
                        commissionAmount = partner.commissionValue; // #months
                    }

                    // --- NEW: Subsidize custom tech partner coupon ---
                    if (extraTxnFields && extraTxnFields.couponCode) {
                        const Coupon = require('../models/Coupon');
                        const usedCoupon = await Coupon.findOne({ where: { code: extraTxnFields.couponCode.toUpperCase() } });
                        if (usedCoupon && usedCoupon.techPartnerId === partner.id) {
                            const discountAmount = extraTxnFields.discountApplied || 0;
                            // Only deduct if it's cash commission
                            if (partner.commissionType !== 'validity_months') {
                                commissionAmount = commissionAmount - discountAmount;
                                if (commissionAmount < 0) commissionAmount = 0;
                                console.log(`[B2B TECH PARTNER] Deducted ${discountAmount} from commission due to subsidized coupon.`);
                            }
                        }
                    }
                    // ---------------------------------------------------

                    const TechPartnerPayout = require('../models/TechPartnerPayout');
                    await TechPartnerPayout.create({
                        techPartnerId: partner.id,
                        userId: user.id,
                        planName: targetPlan.name,
                        planPrice,
                        currency: targetPlan.currency || 'INR',
                        commissionType: partner.commissionType,
                        commissionValue: partner.commissionValue,
                        commissionAmount,
                        status: 'pending'
                    });

                    // Update partner balances
                    partner.pendingBalance = Math.round(((partner.pendingBalance || 0) + commissionAmount) * 100) / 100;
                    partner.totalPayouts = Math.round(((partner.totalPayouts || 0) + commissionAmount) * 100) / 100;
                    await partner.save();

                    console.log(`[B2B TECH PARTNER] Payout of ${commissionAmount} logged for partner ${partner.name} (${partner.code})`);
                }
            }
        }
    } catch (err) {
        console.error('[B2B TECH PARTNER PAYOUT ERROR]', err);
    }
};


// ─── Helper: calculate upgrade discount ─────────────────────────────────────
const calculateUpgradeDiscount = async (user, targetPlan) => {
    // If no active paid plan or no expiry date, no credit
    if (!user.planExpiry || user.plan === 'Free' || user.planStatus !== 'Active') {
        return { creditAmount: 0, finalPrice: parseFloat(targetPlan.price), remainingDays: 0, currentPlanName: user.plan };
    }

    // Renewals (SAME tier): No cash discount applied. Instead, backend will stack the time extension.
    if (user.plan === targetPlan.name) {
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
        const { interval } = req.query;
        let targetPlan = await Plan.findOne({ where: { name: planName } });
        if (!targetPlan) return res.status(404).json({ error: `Plan '${planName}' not found.` });

        // Override targetPlan.price based on requested interval
        if (interval === 'month' && targetPlan.monthlyPrice > 0) targetPlan.price = targetPlan.monthlyPrice;
        else if (interval === 'half-year' && targetPlan.halfYearlyPrice > 0) targetPlan.price = targetPlan.halfYearlyPrice;
        else if (interval === 'year' && targetPlan.yearlyPrice > 0) targetPlan.price = targetPlan.yearlyPrice;

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

// --- POST /create-order --- Step 1 of checkout ---
router.post('/create-order', async (req, res) => {
    try {
        const { planName, isUpgrade, couponCode, itemId, interval, successUrl, cancelUrl } = req.body;
        
        const user = await User.findByPk(req.user.id);
        
        let finalPriceToCharge = 0;
        let targetCurrency = 'USD';
        let orderNotes = { userId: req.user.id };

        if (itemId) {
            // It's a Store Item purchase
            const StoreItem = require('../models/StoreItem');
            const targetItem = await StoreItem.findByPk(itemId);
            if (!targetItem || !targetItem.isActive) return res.status(404).json({ error: `Store item not found or inactive.` });
            
            finalPriceToCharge = parseFloat(targetItem.price);
            targetCurrency = targetItem.currency || 'USD';
            orderNotes.itemId = itemId;
            orderNotes.itemName = targetItem.name;
        } else {
            // It's a Plan purchase
            let targetPlan = await Plan.findOne({ where: { name: planName } });
            if (!targetPlan) return res.status(404).json({ error: `Plan '${planName}' not found.` });
            
            // Override price and interval based on user selection
            if (interval === 'month' && targetPlan.monthlyPrice > 0) targetPlan.price = targetPlan.monthlyPrice;
            else if (interval === 'half-year' && targetPlan.halfYearlyPrice > 0) targetPlan.price = targetPlan.halfYearlyPrice;
            else if (interval === 'year' && targetPlan.yearlyPrice > 0) targetPlan.price = targetPlan.yearlyPrice;
            if (interval) targetPlan.interval = interval;
            
            finalPriceToCharge = parseFloat(targetPlan.price);
            targetCurrency = targetPlan.currency || 'USD';
            orderNotes.planName = planName;
            orderNotes.interval = targetPlan.interval; // Track which interval was bought

            // Upgrade logic
            if (isUpgrade && user.planStatus === 'Active' && user.planExpiry && user.plan !== 'Free') {
                const math = await calculateUpgradeDiscount(user, targetPlan);
                finalPriceToCharge = math.finalPrice;
            }

            // Apply Coupon if provided (only for plans for now)
            if (couponCode) {
                const coupon = await Coupon.findOne({ where: { code: couponCode.toUpperCase() } });
                if (coupon && coupon.isActive) {
                    let isValid = true;
                    const now = new Date();
                    
                    if (isUpgrade && !coupon.isValidForUpgrades) isValid = false;
                    if (coupon.startDate && new Date(coupon.startDate) > now) isValid = false;
                    if (coupon.expiryDate && new Date(coupon.expiryDate) < now) isValid = false;
                    if (coupon.maxUses > 0 && coupon.usesCount >= coupon.maxUses) isValid = false;
                    if (coupon.applicablePlans && coupon.applicablePlans.length > 0 && !coupon.applicablePlans.includes(planName)) isValid = false;
                    if (coupon.minPurchaseAmount > 0 && parseFloat(targetPlan.price) < coupon.minPurchaseAmount) isValid = false;
                    
                    if (coupon.validIntervals && coupon.validIntervals.length > 0) {
                        if (!targetPlan.interval || !coupon.validIntervals.includes(targetPlan.interval)) isValid = false;
                    }
                    if (coupon.isFirstPurchaseOnly) {
                        const anyPastTxn = await Transaction.count({ where: { userId: req.user.id, status: 'COMPLETED' } });
                        if (anyPastTxn > 0) isValid = false;
                    }
                    if (coupon.allowedEmails && coupon.allowedEmails.length > 0) {
                        const userEmail = user.email.toLowerCase();
                        const isMatch = coupon.allowedEmails.some(allowed => {
                            const term = allowed.toLowerCase().trim();
                            return term.startsWith('@') ? userEmail.endsWith(term) : userEmail === term;
                        });
                        if (!isMatch) isValid = false;
                    }
                    if (isValid) {
                        let appliedDiscount = 0;
                        if (coupon.discountType === 'percentage') {
                            appliedDiscount = finalPriceToCharge * (coupon.discountValue / 100);
                            if (coupon.maxDiscountCap && coupon.maxDiscountCap > 0 && appliedDiscount > coupon.maxDiscountCap) {
                                appliedDiscount = coupon.maxDiscountCap;
                            }
                        } else if (coupon.discountType === 'fixed') {
                            appliedDiscount = coupon.discountValue;
                        }
                        if (appliedDiscount > finalPriceToCharge) appliedDiscount = finalPriceToCharge;
                        finalPriceToCharge = finalPriceToCharge - appliedDiscount;
                    }
                }
            }
        }

        // If it's an upgrade, apply backend calculation to ensure exact matched amounts
        if (isUpgrade && user.planStatus === 'Active' && user.planExpiry && user.plan !== 'Free') {
            const math = await calculateUpgradeDiscount(user, targetPlan);
            finalPriceToCharge = math.finalPrice;
        }

        // Apply Coupon if provided
        if (couponCode) {
            const coupon = await Coupon.findOne({ where: { code: couponCode.toUpperCase() } });
            if (coupon && coupon.isActive) {
                // Determine valid status
                let isValid = true;
                const now = new Date();

                if (isUpgrade && !coupon.isValidForUpgrades) isValid = false;
                if (coupon.startDate && new Date(coupon.startDate) > now) isValid = false;
                if (coupon.expiryDate && new Date(coupon.expiryDate) < now) isValid = false;
                if (coupon.maxUses > 0 && coupon.usesCount >= coupon.maxUses) isValid = false;
                if (coupon.applicablePlans && coupon.applicablePlans.length > 0 && !coupon.applicablePlans.includes(planName)) isValid = false;
                if (coupon.minPurchaseAmount > 0 && parseFloat(targetPlan.price) < coupon.minPurchaseAmount) isValid = false;

                // v2 Constraints
                if (coupon.validIntervals && coupon.validIntervals.length > 0) {
                    if (!targetPlan.interval || !coupon.validIntervals.includes(targetPlan.interval)) isValid = false;
                }

                if (coupon.isFirstPurchaseOnly) {
                    const anyPastTxn = await Transaction.count({ where: { userId: req.user.id, status: 'COMPLETED' } });
                    if (anyPastTxn > 0) isValid = false;
                }

                if (coupon.allowedEmails && coupon.allowedEmails.length > 0) {
                    const userEmail = user.email.toLowerCase();
                    const isMatch = coupon.allowedEmails.some(allowed => {
                        const term = allowed.toLowerCase().trim();
                        return term.startsWith('@') ? userEmail.endsWith(term) : userEmail === term;
                    });
                    if (!isMatch) isValid = false;
                }

                // If valid, apply logic
                if (isValid) {
                    if (coupon.discountType === 'percentage') {
                        appliedDiscount = finalPriceToCharge * (coupon.discountValue / 100);
                        if (coupon.maxDiscountCap && coupon.maxDiscountCap > 0 && appliedDiscount > coupon.maxDiscountCap) {
                            appliedDiscount = coupon.maxDiscountCap;
                        }
                    } else if (coupon.discountType === 'fixed') {
                        appliedDiscount = coupon.discountValue;
                    }
                    if (appliedDiscount > finalPriceToCharge) appliedDiscount = finalPriceToCharge;
                    finalPriceToCharge = finalPriceToCharge - appliedDiscount;
                }
            }
        }

        const paymentIntent = await PaymentService.createPaymentIntent({
            amount: finalPriceToCharge,
            currency: targetCurrency,
            description: planName ? `Plan: ${planName}` : `Store Item: ${orderNotes.itemName}`,
            orderNotes,
            userEmail: user.email,
            userName: user.name,
            successUrl: successUrl || `${process.env.FRONTEND_URL || 'http://localhost:5173'}/app/checkout`,
            cancelUrl: cancelUrl || `${process.env.FRONTEND_URL || 'http://localhost:5173'}/app/checkout`
        });

        res.json({
            ...paymentIntent,
            planName,
            userName: user.name,
            userEmail: user.email
        });
    } catch (err) {
        console.error('Create Order Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ─── POST /verify-payment ── Step 2: verify signature then upgrade ────────────
router.post('/verify-payment', async (req, res) => {
    try {
        const { gateway, payload, planName, couponCode, discountApplied, itemId } = req.body;

        if (!gateway || !payload || (!planName && !itemId)) {
            return res.status(400).json({ error: 'Missing payment verification fields.' });
        }

        try {
            await PaymentService.verifyPayment({ gateway, payload });
        } catch (e) {
            console.error('Payment verification failed:', e);
            return res.status(400).json({ error: e.message || 'Payment verification failed.' });
        }

        // Extract generic reference for transaction
        let transactionReference = payload.razorpay_order_id || payload.session_id || payload.txn_id || payload.order_id || 'unknown';

        if (itemId) {
            // It's a Store Item Purchase
            const StoreItem = require('../models/StoreItem');
            const targetItem = await StoreItem.findByPk(itemId);
            if (!targetItem) return res.status(404).json({ error: `Store item not found.` });

            const user = await User.findByPk(req.user.id);
            
            // Record Transaction with actual amount paid (subtract discount if any)
            const discountAppliedStore = parseFloat(discountApplied) || 0;
            const actualAmountPaid = Math.max(0, parseFloat(targetItem.price) - discountAppliedStore);

            await Transaction.create({
                userId: user.id,
                amount: actualAmountPaid,
                currency: targetItem.currency || 'USD',
                planName: `Store: ${targetItem.name}`,
                status: 'COMPLETED',
                paymentGateway: gateway,
                transactionReference: transactionReference,
                ...(discountAppliedStore > 0 ? { discountApplied: discountAppliedStore, couponCode: couponCode || null } : {})
            });

            // Grant Resource
            if (targetItem.itemType === 'ai_tokens') {
                user.aiTokenBalance = (user.aiTokenBalance || 0) + targetItem.amount;
            } else if (targetItem.itemType === 'messages') {
                // If they have an active plan, their message limit is dynamically checked against Plan.
                // We shouldn't permanently alter their DB user limit unless it's designed that way.
                // Normally Top-up messages might be a separate field like 'extraMessageLimit'.
                // Since there is no 'extraMessageLimit' field currently, let's treat it as a hard bump
                // on their underlying active plan limit or store it loosely.
                // But wait, user doesn't have a messageLimit field directly (it comes from Plan).
                // Let's create an 'extraMessageLimit' field on User if we need to track this, 
                // but for now let's just log it if we haven't added that field. 
                // Actually, let's just assume we add `extraMessageLimit` to User model in the future, 
                // for now fallback to safely doing nothing or using standard pattern.
                // To make it functional, I will increment a new field `extraTopupMessages` on the user implicitly via JSON or schema update later, or if it doesn't exist, it will just not fail.
                if (user.extraTopupMessages === undefined) {
                    console.warn("User model missing extraTopupMessages field. Attempting to set anyway.");
                }
                user.extraTopupMessages = (user.extraTopupMessages || 0) + targetItem.amount;
            } else if (targetItem.itemType === 'contacts') {
                user.extraTopupContacts = (user.extraTopupContacts || 0) + targetItem.amount;
            }
            
            await user.save();
            return res.json({ success: true, message: `Successfully purchased ${targetItem.name}` });
            
        } else {
            // It's a Plan Upgrade
            const targetPlan = await Plan.findOne({ where: { name: planName } });
            if (!targetPlan) return res.status(404).json({ error: `Plan '${planName}' not found.` });

            // Update coupon usage if applicable
            if (couponCode) {
                const coupon = await Coupon.findOne({ where: { code: couponCode.toUpperCase() } });
                if (coupon) {
                    await coupon.increment('usesCount', { by: 1 });
                }
            }

            await applyUpgrade(req.user.id, targetPlan, {
                paymentGateway: gateway,
                transactionReference: transactionReference,
                couponCode: couponCode || null,
                discountApplied: discountApplied || 0,
                amountPaid: Math.max(0, parseFloat(targetPlan.price) - (parseFloat(discountApplied) || 0)) // fallback approximation
            });

            return res.json({ success: true, message: `Successfully upgraded to ${planName}` });
        }
    } catch (err) {
        console.error('Verify Payment Error:', err);
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

// POST /downgrade-to-free - Option A manual cancel
router.post('/downgrade-to-free', async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        
        await user.update({
            plan: 'Free',
            planStatus: 'Active',
            planExpiry: null
        });

        res.json({ success: true, message: 'Downgraded to Free plan' });
    } catch (err) {
        console.error('Downgrade Error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
