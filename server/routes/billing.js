const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { Op } = require('sequelize');
const auth = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');
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
const { getMonthlyMessageCount } = require('../utils/planLimits');
const AdminNotification = require('../models/AdminNotification');
const { sendAdminAlert } = require('../services/systemMessenger');
const storageProvider = require('../utils/storageProvider');
router.use(auth);

const PaymentService = require('../services/PaymentService');

// ── Short ID generator ──────────────────────────────────────────────────────
// Generates a random 7-char ID from an unambiguous alphabet (no 0/O/1/I/L).
// 31^7 = ~27.5 billion combinations — collision is statistically impossible.
// DB unique constraint + 10-attempt retry loop guarantees no repeat is stored.
const SHORT_ID_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // 31 chars
const SHORT_ID_LENGTH = 7;

async function generateShortId() {
    for (let attempt = 0; attempt < 10; attempt++) {
        const bytes = crypto.randomBytes(SHORT_ID_LENGTH);
        const id = Array.from(bytes)
            .map(b => SHORT_ID_ALPHABET[b % SHORT_ID_ALPHABET.length])
            .join('');
        const exists = await Transaction.count({ where: { shortId: id } });
        if (!exists) return id;
    }
    // Statistically impossible to reach here, but fallback to UUID slice just in case
    return crypto.randomUUID().replace(/-/g, '').substring(0, 7).toUpperCase();
}
// ────────────────────────────────────────────────────────────────────────────

// ─── POST /upload-payment-screenshot ── Upload proof image before submission ──
const screenshotUploader = storageProvider('payment-screenshots', {
    uniqueNames: true,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
    fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (allowed.includes(file.mimetype)) cb(null, true);
        else cb(new Error('Only JPG, PNG, WebP, or GIF images are allowed for payment screenshots.'));
    }
});
router.post('/upload-payment-screenshot', screenshotUploader.single('screenshot'), async (req, res) => {
    try {
        if (!req.file || !req.file.publicUrl) {
            return res.status(400).json({ error: 'No screenshot file received.' });
        }
        res.json({ success: true, url: req.file.publicUrl });
    } catch (err) {
        console.error('[BILLING] Screenshot upload error:', err);
        res.status(500).json({ error: err.message });
    }
});
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

// ─── Plan rules: which plans can be bought, and the price/duration per interval ──
const { INTERNAL_PLAN_NAMES, isPlanPurchasable, resolvePlanPricing } = require('../utils/planRules');

// ─── Helper: validate a platform coupon for a plan purchase ───────────────────
// Single rule set shared by online checkout and bank-transfer requests.
// Returns { coupon, discount } or null when the coupon does not apply.
const { getPartnerCouponCap } = require('../utils/partnerCoupon');
const evaluatePlanCoupon = async ({ couponCode, user, planName, interval, listPrice, baseAmount, isUpgrade }) => {
    if (!couponCode) return null;
    const coupon = await Coupon.findOne({ where: { code: String(couponCode).toUpperCase() } });
    if (!coupon || !coupon.isActive) return null;

    const now = new Date();
    if (isUpgrade && !coupon.isValidForUpgrades) return null;
    if (coupon.startDate && new Date(coupon.startDate) > now) return null;
    if (coupon.expiryDate && new Date(coupon.expiryDate) < now) return null;
    if (coupon.maxUses > 0 && coupon.usesCount >= coupon.maxUses) return null;
    if (coupon.applicablePlans && coupon.applicablePlans.length > 0 && !coupon.applicablePlans.includes(planName)) return null;
    if (coupon.minPurchaseAmount > 0 && parseFloat(listPrice) < coupon.minPurchaseAmount) return null;
    if (coupon.validIntervals && coupon.validIntervals.length > 0) {
        if (!interval || !coupon.validIntervals.includes(interval)) return null;
    }
    if (coupon.isFirstPurchaseOnly) {
        const anyPastTxn = await Transaction.count({ where: { userId: user.id, status: 'COMPLETED' } });
        if (anyPastTxn > 0) return null;
    }
    if (coupon.allowedEmails && coupon.allowedEmails.length > 0) {
        const userEmail = (user.email || '').toLowerCase();
        const isMatch = coupon.allowedEmails.some(allowed => {
            const term = allowed.toLowerCase().trim();
            return term.startsWith('@') ? userEmail.endsWith(term) : userEmail === term;
        });
        if (!isMatch) return null;
    }

    let discount = 0;
    if (coupon.discountType === 'percentage') {
        discount = baseAmount * (coupon.discountValue / 100);
        if (coupon.maxDiscountCap && coupon.maxDiscountCap > 0 && discount > coupon.maxDiscountCap) {
            discount = coupon.maxDiscountCap;
        }
    } else if (coupon.discountType === 'fixed') {
        discount = parseFloat(coupon.discountValue) || 0;
    }

    // Partner coupons: only for that partner's referrals, capped at their commission
    if (coupon.techPartnerId) {
        const cap = await getPartnerCouponCap(coupon, user.id, baseAmount);
        if (!cap.allowed) return null;
        if (discount > cap.maxDiscount) discount = cap.maxDiscount;
    }

    discount = Math.max(0, Math.min(discount, baseAmount));
    discount = Math.round(discount * 100) / 100;
    return { coupon, discount };
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

    const txnData = {
        userId,
        amount: amountPaid,
        currency: targetPlan.currency || 'INR',
        planName: targetPlan.name,
        status: 'COMPLETED',
        userName: user.name || null,
        userEmail: user.email || null,
        userPhone: user.phone || null,
        ...extraTxnFields
    };

    if (extraTxnFields.transactionReference) {
        const existingTxn = await Transaction.findOne({ where: { transactionReference: extraTxnFields.transactionReference } });
        if (existingTxn) {
            await existingTxn.update(txnData);
        } else {
            await Transaction.create(txnData);
        }
    } else {
        await Transaction.create(txnData);
    }

    // Grant AI Tokens
    let newAiTokens = user.aiTokenBalance || 0;
    if (targetPlan.aiTokensAllowance) {
        newAiTokens += targetPlan.aiTokensAllowance;
    }

    // Grant Included Add-ons natively
    // Compute the plan expiry first so we can stamp it onto included addons
    const newExpiry = computePlanExpiry(targetPlan.interval, user.planExpiry, isRenewal);

    if (targetPlan.includedAddons && targetPlan.includedAddons.length > 0) {
        const addonsToInclude = await Addon.findAll({ where: { module_key: targetPlan.includedAddons } });
        for (const addon of addonsToInclude) {
            const existing = await UserAddon.findOne({ where: { userId: user.id, addonId: addon.id } });
            if (existing) {
                existing.status = 'active';
                // Stamp expiry to match plan expiry so scheduler can expire them correctly
                if (newExpiry) {
                    existing.currentPeriodStart = new Date();
                    existing.currentPeriodEnd = newExpiry;
                }
                await existing.save();
            } else {
                await UserAddon.create({
                    userId: user.id,
                    addonId: addon.id,
                    status: 'active',
                    currentPeriodStart: newExpiry ? new Date() : null,
                    currentPeriodEnd: newExpiry || null
                });
            }
        }
    }

    await user.update({
        plan: targetPlan.name,
        planStatus: 'Active',
        planExpiry: newExpiry,
        aiTokenBalance: newAiTokens
    });

    // --- Update CRM Tags for Upgraded Plan ---
    try {
        const SystemConfig = require('../models/SystemConfig');
        const Contact = require('../models/Contact');
        const config = await SystemConfig.getCachedConfig();
        const linkedAdminId = config?.settings?.linkedAdminUserId;
        
        if (linkedAdminId && user.phone) {
            const contact = await Contact.findOne({ where: { userId: linkedAdminId, phone: user.phone } });
            if (contact) {
                // Remove existing Plan tags
                let updatedTags = (contact.tags || []).filter(t => typeof t !== 'string' || (!t.startsWith('Plan: ') && !t.endsWith(' - Expired') && t !== 'Trial Expired'));
                
                // Append new Plan tag
                updatedTags.push(`Plan: ${targetPlan.name}`);
                
                contact.tags = updatedTags;
                await contact.save();
                console.log(`[ALERTS] Updated CRM tags for plan upgrade: ${user.email} -> ${targetPlan.name}`);
            }
        }
    } catch (tagSyncErr) {
        console.error("Error syncing CRM tags on plan upgrade:", tagSyncErr);
    }

    // --- Dynamic Referral System Processing ---
    try {
        // BUG #2 FIX: Use the actual amount paid (after coupon) not the list price.
        // If a 100% coupon was used, amountPaid = 0 and no reward should be given.
        const _referralAmountPaid = (extraTxnFields?.amountPaid !== undefined && extraTxnFields?.amountPaid !== null)
            ? parseFloat(extraTxnFields.amountPaid)
            : parseFloat(targetPlan.price);
        if (user.referredBy && _referralAmountPaid > 0) {
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
                                    // BUG #4 FIX: If planExpiry is null (lifetime plan), use current date as base
                                    const base = user.planExpiry ? new Date(user.planExpiry) : new Date();
                                    base.setMonth(base.getMonth() + reward.value);
                                    user.planExpiry = base;
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
                            // BUG #3 FIX: Use actual paid amount as commission base, not list price.
                            // This prevents over-paying commission when a global coupon reduces revenue.
                            const _tpActualPaid = _referralAmountPaid > 0 ? _referralAmountPaid : parseFloat(targetPlan.price);
                            let commissionAmount = Math.round((_tpActualPaid * commissionRate / 100) * 100) / 100;

                            // --- Subsidize custom tech partner coupon ---
                            // discountApplied always comes from our own order record (never the request body).
                            if (extraTxnFields && extraTxnFields.couponCode) {
                                const Coupon = require('../models/Coupon');
                                const usedCoupon = await Coupon.findOne({ where: { code: extraTxnFields.couponCode.toUpperCase() } });
                                const TechPartner = require('../models/TechPartner');
                                const tpProfile = usedCoupon?.techPartnerId
                                    ? await TechPartner.findOne({ where: { id: usedCoupon.techPartnerId, userId: referrer.id } })
                                    : null;
                                if (usedCoupon && tpProfile) {
                                    const discountAmount = Math.max(0, parseFloat(extraTxnFields.discountApplied) || 0);
                                    commissionAmount = Math.max(0, Math.round((commissionAmount - discountAmount) * 100) / 100);
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
        // BUG #3 FIX (B2B path): Also use actual paid amount for B2B payout commission base.
        const _b2bActualPaid = (extraTxnFields?.amountPaid !== undefined && extraTxnFields?.amountPaid !== null)
            ? parseFloat(extraTxnFields.amountPaid)
            : parseFloat(targetPlan.price);
        if (user.techPartnerId && _b2bActualPaid > 0) {
            const config = await SystemConfig.getCachedConfig();
            const tpProgramConfig = config.settings?.techPartnerProgram || {};

            if (tpProgramConfig.enabled !== false) {
                const TechPartner = require('../models/TechPartner');
                const partner = await TechPartner.findByPk(user.techPartnerId);

                if (partner && partner.enabled) {
                    const planPrice = parseFloat(targetPlan.price);
                    let commissionAmount = 0;

                    if (partner.commissionType === 'percentage') {
                        // Use actual paid amount as the base to avoid over-paying on discounted sales
                        commissionAmount = Math.round((_b2bActualPaid * partner.commissionValue / 100) * 100) / 100;
                    } else if (partner.commissionType === 'flat') {
                        commissionAmount = partner.commissionValue;
                    } else if (partner.commissionType === 'validity_months') {
                        commissionAmount = partner.commissionValue; // #months — not monetary, not affected by discounts
                    }

                    // --- NEW: Subsidize custom tech partner coupon ---
                    if (extraTxnFields && extraTxnFields.couponCode) {
                        const Coupon = require('../models/Coupon');
                        const usedCoupon = await Coupon.findOne({ where: { code: extraTxnFields.couponCode.toUpperCase() } });
                        if (usedCoupon && usedCoupon.techPartnerId === partner.id) {
                            const discountAmount = Math.max(0, parseFloat(extraTxnFields.discountApplied) || 0);
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
    return { newExpiry };
};

// ─── Helper: calculate upgrade discount ─────────────────────────────────────

const calculateUpgradeDiscount = async (user, targetPlan) => {
    // If no active paid plan or no expiry date, no credit
    if (!user.planExpiry || user.plan === 'Free' || user.planStatus !== 'Active') {
        return { creditAmount: 0, finalPrice: parseFloat(targetPlan.price), remainingDays: 0, currentPlanName: user.plan, totalDays: 0, dailyRate: 0, paidAmount: 0 };
    }

    // Renewals (SAME tier): No cash discount applied. Instead, backend will stack the time extension.
    if (user.plan === targetPlan.name) {
        return { creditAmount: 0, finalPrice: parseFloat(targetPlan.price), remainingDays: 0, currentPlanName: user.plan, totalDays: 0, dailyRate: 0, paidAmount: 0 };
    }

    const currentPlan = await Plan.findOne({ where: { name: user.plan } });
    if (!currentPlan) {
        return { creditAmount: 0, finalPrice: parseFloat(targetPlan.price), remainingDays: 0, currentPlanName: user.plan, totalDays: 0, dailyRate: 0, paidAmount: 0 };
    }

    const now = new Date();
    const expiry = new Date(user.planExpiry);

    if (expiry <= now) {
        return { creditAmount: 0, finalPrice: parseFloat(targetPlan.price), remainingDays: 0, currentPlanName: user.plan, totalDays: 0, dailyRate: 0, paidAmount: 0 };
    }

    // ─── FIX #1: Use actual paid amount from last transaction, NOT the Plan DB default ───
    // This accounts for coupons, discounts, and the correct interval price the user actually paid.
    const lastTxn = await Transaction.findOne({
        where: {
            userId: user.id,
            status: 'COMPLETED',
            planName: user.plan  // Match exact plan name
        },
        order: [['createdAt', 'DESC']]
    });

    let paidAmount = 0;
    let totalDays = 30; // fallback

    if (lastTxn) {
        // Use actual transaction amount (what user really paid, after coupons/discounts)
        paidAmount = parseFloat(lastTxn.amount) || 0;

        // ─── FIX #2: Calculate totalDays from actual transaction date to expiry ───
        // This gives the EXACT billing cycle length, not a hardcoded estimate.
        // Works correctly for monthly (≈30), half-yearly (≈180), yearly (≈365), and any custom duration.
        const txnDate = new Date(lastTxn.createdAt);
        const msDiff = expiry.getTime() - txnDate.getTime();
        totalDays = Math.max(1, Math.round(msDiff / (1000 * 60 * 60 * 24)));
    } else {
        // No transaction found (e.g. admin-granted plan). Fall back to plan model estimate.
        paidAmount = parseFloat(currentPlan.price) || 0;
        if (currentPlan.interval === 'year') totalDays = 365;
        else if (currentPlan.interval === 'half-year') totalDays = 180;
        else totalDays = 30;
    }

    // If user paid ₹0 (free coupon, trial, etc.), no credit to give
    if (paidAmount <= 0) {
        return { creditAmount: 0, finalPrice: parseFloat(targetPlan.price), remainingDays: 0, currentPlanName: currentPlan.name, totalDays, dailyRate: 0, paidAmount: 0 };
    }

    const dailyRate = paidAmount / totalDays;

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
        currentPlanName: currentPlan.name,
        totalDays,
        dailyRate: Math.round(dailyRate * 100) / 100,
        paidAmount: Math.round(paidAmount * 100) / 100
    };
};

// GET All Public Plans (for upgrade selection)
router.get('/plans', async (req, res) => {
    try {
        const plans = await Plan.findAll({
            where: { isPublic: true, isActive: true, name: { [Op.notIn]: INTERNAL_PLAN_NAMES } },
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
        // Using getMonthlyMessageCount (ChatMessage table, OUTBOUND direction) — same
        // function used by plan enforcement in chat.js, webhook.js, campaignProcessor etc.
        // This ensures the campaign panel "Past" usage matches the dashboard "This Month's Usage".
        const messagesSent = await getMonthlyMessageCount(req.user.id);

        // Fetch Plan Details from DB
        const planName = user.plan || 'Free';
        const planDetails = await Plan.findOne({ where: { name: planName } });

        // Defaults if plan missing (fallback safeties)
        let monthlyLimit = planDetails ? planDetails.messageLimit : 30;
        let templateLimit = planDetails ? planDetails.templateLimit : 2;
        let contactLimit = planDetails ? planDetails.contactLimit : 10;
        let planPrice = planDetails ? parseFloat(planDetails.price) : 0;
        let currency = planDetails ? planDetails.currency : null;

        // Force global currency if plan is free or currency is missing
        if (!currency || planPrice === 0) {
            const SystemConfig = require('../models/SystemConfig');
            const config = await SystemConfig.getCachedConfig();
            currency = config?.settings?.globalCurrency || 'USD';
        }

        // Count current templates and contacts
        const Template = require('../models/Template');
        const Contact = require('../models/Contact');
        const [templateCount, contactCount] = await Promise.all([
            Template.count({ where: { userId: req.user.id } }),
            Contact.count({ where: { userId: req.user.id } })
        ]);

        // Find user's last transaction to deduce actual billing interval
        const lastTxn = await Transaction.findOne({
            where: { userId: req.user.id, status: 'COMPLETED', planName: user.plan },
            order: [['createdAt', 'DESC']]
        });
        
        let actualInterval = 'month'; // default
        if (lastTxn && user.planExpiry) {
            const diffDays = (new Date(user.planExpiry) - new Date(lastTxn.createdAt)) / (1000 * 60 * 60 * 24);
            if (diffDays > 300) actualInterval = 'year';
            else if (diffDays > 150) actualInterval = 'half-year';
            else actualInterval = 'month';
        }

        // Adjust planPrice based on actualInterval if we have a valid plan
        if (planDetails) {
            if (actualInterval === 'year' && parseFloat(planDetails.yearlyPrice) > 0) {
                planPrice = parseFloat(planDetails.yearlyPrice);
            } else if (actualInterval === 'half-year' && parseFloat(planDetails.halfYearlyPrice) > 0) {
                planPrice = parseFloat(planDetails.halfYearlyPrice);
            } else if (actualInterval === 'month' && parseFloat(planDetails.monthlyPrice) > 0) {
                planPrice = parseFloat(planDetails.monthlyPrice);
            }
        }

        res.json({
            plan: {
                name: planName,
                status: user.planStatus || 'Active',
                expiry: user.planExpiry,
                price: planPrice,
                currency: currency,
                interval: actualInterval
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

// GET Usage Breakdown — powers the "View Usage" modal in the billing dashboard
router.get('/usage-breakdown', async (req, res) => {
    try {
        const { sequelize: db } = require('../config/database');
        const Message = require('../models/Message');
        const ChatMessage = require('../models/ChatMessage');

        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const userId = req.user.id;

        // 1. Broadcast campaigns this month with their counted messages
        const campaigns = await Message.findAll({
            where: { userId, createdAt: { [Op.gte]: startOfMonth } },
            attributes: ['id', 'campaignName', 'createdAt', 'sentCount', 'deliveredCount', 'failedCount'],
            order: [['createdAt', 'DESC']]
        });

        const campaignIds = campaigns.map(c => c.id);
        let countMap = {};
        if (campaignIds.length > 0) {
            const campaignCounts = await MessageLog.findAll({
                where: {
                    campaignId: { [Op.in]: campaignIds },
                    status: { [Op.notIn]: ['FAILED', 'RETRY_PENDING'] }
                },
                attributes: ['campaignId', [db.fn('COUNT', db.col('id')), 'count']],
                group: ['campaignId'],
                raw: true
            });
            campaignCounts.forEach(r => { countMap[r.campaignId] = parseInt(r.count); });
        }

        const broadcasts = campaigns.map(c => ({
            id: c.id,
            name: c.campaignName || 'Unnamed Campaign',
            date: c.createdAt,
            counted: countMap[c.id] || 0,
            delivered: c.deliveredCount,
            failed: c.failedCount
        }));

        // 2. Daily ChatMessage outbound grouped by date + source (non-campaign)
        const dailyRaw = await db.query(
            `SELECT DATE("ChatMessages"."createdAt") AS date,
                    COALESCE("ChatMessages"."source", 'live_inbox') AS source,
                    COUNT(*) AS count
             FROM "ChatMessages"
             INNER JOIN "Conversations"
               ON "ChatMessages"."conversationId" = "Conversations"."id"
             WHERE "ChatMessages"."direction" = 'OUTBOUND'
               AND ("ChatMessages"."source" IS NULL OR "ChatMessages"."source" != 'campaign')
               AND ("ChatMessages"."status" IS NULL OR "ChatMessages"."status" != 'failed')
               AND "ChatMessages"."createdAt" >= :startOfMonth
               AND "Conversations"."userId" = :userId
             GROUP BY DATE("ChatMessages"."createdAt"),
                      COALESCE("ChatMessages"."source", 'live_inbox')
             ORDER BY DATE("ChatMessages"."createdAt") ASC`,
            { replacements: { startOfMonth, userId }, type: db.QueryTypes.SELECT }
        );

        // 3. Summary totals by source
        const summaryRaw = await db.query(
            `SELECT COALESCE("ChatMessages"."source", 'live_inbox') AS source,
                    COUNT(*) AS count
             FROM "ChatMessages"
             INNER JOIN "Conversations"
               ON "ChatMessages"."conversationId" = "Conversations"."id"
             WHERE "ChatMessages"."direction" = 'OUTBOUND'
               AND ("ChatMessages"."source" IS NULL OR "ChatMessages"."source" != 'campaign')
               AND ("ChatMessages"."status" IS NULL OR "ChatMessages"."status" != 'failed')
               AND "ChatMessages"."createdAt" >= :startOfMonth
               AND "Conversations"."userId" = :userId
             GROUP BY COALESCE("ChatMessages"."source", 'live_inbox')`,
            { replacements: { startOfMonth, userId }, type: db.QueryTypes.SELECT }
        );

        const totalBroadcast = Object.values(countMap).reduce((s, v) => s + v, 0);
        const summary = { broadcast: totalBroadcast };
        summaryRaw.forEach(r => { summary[r.source] = parseInt(r.count); });
        summary.total = Object.values(summary).reduce((s, v) => s + v, 0);

        res.json({ broadcasts, dailyInbox: dailyRaw, summary });
    } catch (err) {
        console.error('[BILLING] usage-breakdown error:', err);
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
        
        const Invoice = require('../models/Invoice');
        const transactionIds = transactions.map(t => t.id);
        const invoices = await Invoice.findAll({
            where: { transactionId: transactionIds }
        });
        
        const enrichedTransactions = transactions.map(t => {
            const invoice = invoices.find(i => i.transactionId === t.id);
            return {
                ...t.toJSON(),
                invoice: invoice ? invoice.toJSON() : null
            };
        });

        res.json(enrichedTransactions);
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

        // Same price resolution as create-order, so the preview matches what is charged
        const pricing = resolvePlanPricing(targetPlan, interval);
        if (!pricing) return res.status(400).json({ error: 'This billing period is not available for this plan.' });
        targetPlan.price = pricing.price;
        targetPlan.interval = pricing.interval;

        const user = await User.findByPk(req.user.id);
        const upgradeCalc = await calculateUpgradeDiscount(user, targetPlan);

        res.json({
            targetPlanPrice: parseFloat(targetPlan.price),
            creditAmount: upgradeCalc.creditAmount,
            finalPayableAmount: upgradeCalc.finalPrice,
            remainingDays: upgradeCalc.remainingDays,
            currentPlanName: upgradeCalc.currentPlanName,
            targetPlanName: targetPlan.name,
            // Extra transparency fields for checkout breakdown
            totalDays: upgradeCalc.totalDays,
            dailyRate: upgradeCalc.dailyRate,
            paidAmount: upgradeCalc.paidAmount,
            // New trial protection fields
            hasUsedTrial: user.hasUsedTrial || false,
            isCurrentPlanPaid: user.planStatus === 'Active' && user.plan !== 'Free'
        });
    } catch (err) {
        console.error('Calculate Upgrade Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// --- POST /create-order --- Step 1 of checkout ---
router.post('/create-order', async (req, res) => {
    try {
        const { planName, isUpgrade, couponCode, itemId, interval, successUrl, cancelUrl, quantity } = req.body;
        
        const user = await User.findByPk(req.user.id);
        
        let finalPriceToCharge = 0;
        let appliedDiscount = 0;
        let appliedCouponCode = null; // only set when the coupon actually applied
        let targetPlan = null;
        let targetCurrency = 'USD';
        let orderNotes = { userId: req.user.id };

        // ── CONFLICT GUARD: Block Razorpay if user has a pending manual payment request ──
        // Without this, a user can: submit manual request → pay online → plan activates →
        // admin approves manual → plan extended again for free (double grant).
        // Only applies to plan purchases (not store items).
        if (!itemId && planName) {
            const existingManualPending = await Transaction.findOne({
                where: {
                    userId: req.user.id,
                    status: ['PENDING_APPROVAL', 'LOCKED'],
                    paymentGateway: 'manual'
                }
            });
            if (existingManualPending) {
                return res.status(409).json({
                    error: 'You have a pending bank transfer request awaiting admin approval. Please wait for it to be processed, or cancel it first before paying online.',
                    hasPendingManual: true,
                    pendingPlanName: existingManualPending.planName
                });
            }
        }
        // ─────────────────────────────────────────────────────────────────────────────────

        if (itemId) {
            // It's a Store Item purchase
            const StoreItem = require('../models/StoreItem');
            const targetItem = await StoreItem.findByPk(itemId);
            if (!targetItem || !targetItem.isActive) return res.status(404).json({ error: `Store item not found or inactive.` });
            
            // Quantity only applies to team seats. It is recorded on the order (planName)
            // so verify-payment never has to trust a quantity sent by the browser.
            let purchaseQty = 1;
            if (targetItem.itemType === 'team_members') {
                const q = parseInt(quantity, 10);
                purchaseQty = Number.isInteger(q) && q > 0 ? q : 1;
            }
            finalPriceToCharge = parseFloat(targetItem.price) * purchaseQty;
            targetCurrency = targetItem.currency || 'USD';
            orderNotes.itemId = itemId;
            orderNotes.itemName = targetItem.name;
            orderNotes.quantity = purchaseQty;
            orderNotes.validityMonths = targetItem.validityMonths || 12;
        } else {
            // It's a Plan purchase
            targetPlan = await Plan.findOne({ where: { name: planName } });
            if (!targetPlan) return res.status(404).json({ error: `Plan '${planName}' not found.` });
            if (!isPlanPurchasable(targetPlan, user)) {
                console.warn(`[SECURITY] create-order blocked — plan '${planName}' is not purchasable. User: ${req.user.id}`);
                return res.status(404).json({ error: `Plan '${planName}' not found.` });
            }

            // Resolve price + duration from the plan's own interval prices FIRST (before any comparisons).
            // Unknown intervals (e.g. 'lifetime') or intervals with no price are rejected.
            const pricing = resolvePlanPricing(targetPlan, interval);
            if (!pricing) return res.status(400).json({ error: 'This billing period is not available for this plan.' });
            targetPlan.price = pricing.price;
            targetPlan.interval = pricing.interval;

            // Trial is NOT a paid subscription — trial users can freely pick any plan
            const isMidSubscription = user.planStatus === 'Active' && user.plan !== 'Free' && (!user.planExpiry || new Date(user.planExpiry) > new Date());

            // Use actual paid amount from last transaction for accurate downgrade comparison
            const lastTxn = await Transaction.findOne({
                where: { userId: req.user.id, status: 'COMPLETED', planName: user.plan },
                order: [['createdAt', 'DESC']]
            });

            // For downgrade check: compare target interval price vs what user actually paid
            const currentPaidAmount = lastTxn ? parseFloat(lastTxn.amount) : 0;
            const isDowngrade = currentPaidAmount > 0 && parseFloat(targetPlan.price) < currentPaidAmount;
            
            if (isDowngrade && isMidSubscription) {
                return res.status(403).json({ error: 'Downgrading is not allowed during an active subscription. Please wait until your current plan expires.' });
            }

            // Interval validity downgrade check (using already-fetched lastTxn)
            let currentInterval = 'month';
            if (lastTxn && user.planExpiry) {
                const diffDays = (new Date(user.planExpiry) - new Date(lastTxn.createdAt)) / (1000 * 60 * 60 * 24);
                if (diffDays > 300) currentInterval = 'year';
                else if (diffDays > 150) currentInterval = 'half-year';
            }
            
            const intervalWeights = { month: 1, 'half-year': 6, year: 12 };
            const targetWeight = intervalWeights[targetPlan.interval] || 1;
            const currentWeight = intervalWeights[currentInterval] || 1;
            
            if (isMidSubscription && targetWeight < currentWeight) {
                return res.status(403).json({ error: 'Downgrading billing cycle duration is not allowed during an active subscription.' });
            }

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
            const couponResult = await evaluatePlanCoupon({
                couponCode,
                user,
                planName,
                interval: targetPlan.interval,
                listPrice: targetPlan.price,
                baseAmount: finalPriceToCharge,
                isUpgrade
            });
            if (couponResult) {
                appliedDiscount = couponResult.discount;
                appliedCouponCode = couponResult.coupon.code;
                finalPriceToCharge = Math.round((finalPriceToCharge - appliedDiscount) * 100) / 100;
            }
        }

        // --- Handle 100% discount or Free items (Bypass Payment Gateway) ---
        if (finalPriceToCharge <= 0) {
            if (itemId) {
                // Store Item Purchase (Free)
                const StoreItem = require('../models/StoreItem');
                const targetItem = await StoreItem.findByPk(itemId);
                if (!targetItem) return res.status(404).json({ error: `Store item not found.` });

                await Transaction.create({
                    userId: user.id,
                    amount: 0,
                    currency: targetItem.currency || 'USD',
                    planName: `Store: ${targetItem.name}`,
                    status: 'COMPLETED',
                    paymentGateway: 'system',
                    transactionReference: `free_${Date.now()}`,
                    ...(typeof appliedDiscount !== 'undefined' && appliedDiscount > 0 ? { discountApplied: appliedDiscount, couponCode: couponCode || null } : {})
                });

                if (targetItem.itemType === 'ai_tokens') {
                    user.aiTokenBalance = (user.aiTokenBalance || 0) + targetItem.amount;
                } else if (targetItem.itemType === 'messages') {
                    user.extraTopupMessages = (user.extraTopupMessages || 0) + targetItem.amount;
                } else if (targetItem.itemType === 'contacts') {
                    user.extraTopupContacts = (user.extraTopupContacts || 0) + targetItem.amount;
                } else if (targetItem.itemType === 'team_members') {
                    const qty = parseInt(orderNotes?.quantity || 1, 10);
                    const months = parseInt(targetItem.validityMonths || 12, 10);
                    user.extraTopupTeamMembers = (user.extraTopupTeamMembers || 0) + (targetItem.amount * qty);
                    // Extend expiry: stack from current expiry if still valid, else start from today
                    const baseDate = (user.teamMemberTopupExpiry && new Date(user.teamMemberTopupExpiry) > new Date())
                        ? new Date(user.teamMemberTopupExpiry)
                        : new Date();
                    baseDate.setMonth(baseDate.getMonth() + months);
                    user.teamMemberTopupExpiry = baseDate;
                }
                await user.save();
                
            } else {
                // Plan Upgrade (Free) — targetPlan already validated and priced above
                if (appliedCouponCode) {
                    await Coupon.increment('usesCount', { by: 1, where: { code: appliedCouponCode } });
                }

                await applyUpgrade(req.user.id, targetPlan, {
                    paymentGateway: 'system',
                    transactionReference: `free_${Date.now()}`,
                    couponCode: appliedCouponCode,
                    discountApplied: appliedDiscount || 0,
                    amountPaid: 0,
                    billingInterval: targetPlan.interval
                });
            }

            return res.json({
                instant: true,
                planName,
                userName: user.name,
                userEmail: user.email
            });
        }
        // -------------------------------------------------------------------

        const paymentIntent = await PaymentService.createPaymentIntent({
            amount: finalPriceToCharge,
            currency: targetCurrency,
            description: planName ? `Plan: ${planName}` : `Store Item: ${orderNotes.itemName}`,
            orderNotes,
            userEmail: user.email,
            userName: user.name,
            userPhone: user.phone || '',
            successUrl: successUrl || `${process.env.FRONTEND_URL || 'http://localhost:5173'}/app/checkout`,
            cancelUrl: cancelUrl || `${process.env.FRONTEND_URL || 'http://localhost:5173'}/app/checkout`
        });

        // Log as FAILED initially so we have a record even if the user abandons checkout.
        // verify-payment will update this same row to COMPLETED once payment is confirmed.
        // We store finalPriceToCharge here — this is the ground truth amount Razorpay charged.
        // billingInterval and upgradeCredit are stored so verify-payment never needs to recalculate.
        let checkoutUpgradeCredit = 0;
        if (!itemId && isUpgrade && orderNotes?.planName) {
            // upgradeCredit = intervalPrice - (finalPriceToCharge + couponDiscount)
            // e.g. yearlyPrice=12000, upgradeCredit=3000, coupon=500 → finalPriceToCharge=8500
            const rawIntervalPrice = planName
                ? (() => {
                    // Re-read plan price for the selected interval for credit calculation
                    // We already mutated targetPlan above, so finalPriceToCharge already has upgrade deducted
                    // Credit = listPrice - finalPriceBeforeCoupon
                    // Since coupon is applied AFTER upgrade, credit = listPrice - (finalPriceToCharge + appliedDiscount)
                    return finalPriceToCharge + (appliedDiscount || 0);
                })()
                : finalPriceToCharge;
            // We can't easily recover the original listPrice here without re-querying.
            // Store upgradeCredit as 0 in the attempt log; it gets set properly when
            // the manual payment flow stores it. Online flow uses amount directly.
        }
        // The gateway's own order/session id — verify-payment looks the order up by this,
        // so it must be the same id the gateway sends back (Stripe session, PhonePe txn, ...).
        const gatewayRef = PaymentService.getIntentReference(paymentIntent);
        if (!gatewayRef) {
            console.error('[BILLING] create-order: gateway returned no order reference', paymentIntent?.gateway);
            return res.status(502).json({ error: 'Could not start the payment. Please try again.' });
        }
        // This record is the source of truth for verify-payment (amount, plan/item,
        // quantity, interval, coupon). If it cannot be saved, do not let the user pay.
        await Transaction.create({
            userId: user.id,
            amount: finalPriceToCharge,      // ← actual gateway-charged amount
            currency: targetCurrency,
            planName: itemId
                ? `Store: ${orderNotes.itemName}${orderNotes.quantity > 1 ? ` × ${orderNotes.quantity}` : ''}`
                : planName,
            billingInterval: !itemId ? orderNotes.interval : null,
            status: 'FAILED',
            paymentGateway: paymentIntent.gateway,
            transactionReference: gatewayRef,
            userName: user.name || null,
            userEmail: user.email || null,
            userPhone: user.phone || null,
            couponCode: appliedCouponCode,
            discountApplied: appliedDiscount || 0,
        });

        res.json({
            ...paymentIntent,
            planName,
            userName: user.name,
            userEmail: user.email
        });
    } catch (err) {
        console.error('Create Order Error:', err);
        const statusCode = err.message && err.message.includes('No payment gateways') ? 400 : 500;
        res.status(statusCode).json({ error: err.message });
    }
});

// ─── POST /verify-payment ── Step 2: verify signature then upgrade ────────────
router.post('/verify-payment', async (req, res) => {
    try {
        // NOTE: couponCode / discountApplied / interval / quantity in the body are ignored on purpose —
        // all of them come from the order record written by create-order.
        const { gateway, payload, planName, itemId } = req.body;

        if (!gateway || !payload || (!planName && !itemId)) {
            return res.status(400).json({ error: 'Missing payment verification fields.' });
        }

        // The gateway's own order/session id, read only from the field that gateway uses
        const gatewayRef = PaymentService.getPayloadReference(gateway, payload);
        if (!gatewayRef) {
            return res.status(400).json({ error: 'Missing payment reference.' });
        }

        try {
            await PaymentService.verifyPayment({ gateway, payload });
        } catch (e) {
            console.error('Payment verification failed:', e);
            
            // 🚨 ADMIN NOTIFICATION - PAYMENT FAILED 🚨
            const user = await User.findByPk(req.user.id);
            const failedPlanName = planName || (itemId ? `Store Item ID: ${itemId}` : 'Unknown');
            try {
                await AdminNotification.create({
                    type: 'SYSTEM_ERROR',
                    message: `Payment Failed for user ${user?.name || req.user.id} trying to purchase ${failedPlanName}. Reason: ${e.message}`,
                    data: { userId: req.user.id, plan: failedPlanName }
                });
                await sendAdminAlert('payment_failed', `Payment Failed for user ${user?.name || req.user.id}.`, {
                    name: user?.name || 'Unknown',
                    plan: failedPlanName
                });
                // 🚨 WA ADMIN NOTIFICATION - SYSTEM ERROR (payment verification failure)
                await sendAdminAlert('system_error', `Payment verification error for user ${user?.name || req.user.id}`, {
                    error: `Payment verification failed: ${e.message.substring(0, 150)}`
                });
            } catch (err) { console.error('Admin alert failed:', err); }

            return res.status(400).json({ error: e.message || 'Payment verification failed.' });
        }

        let transactionReference = gatewayRef;

        if (itemId) {
            // It's a Store Item Purchase

            // ── SECURITY: Replay / ownership / item-swap protection ──────────────
            // 1. The order must have been created by our server (not fabricated).
            // 2. It must not already be COMPLETED (replay attack).
            // 3. It must belong to the requesting user (ownership).
            // 4. The item in the request must match what was ordered (item-swap).
            const orderRecord = await Transaction.findOne({ where: { transactionReference } });
            if (!orderRecord) {
                console.warn(`[SECURITY] store verify-payment rejected — transactionReference '${transactionReference}' not found. User: ${req.user.id}`);
                return res.status(400).json({ error: 'Payment order not recognized. Please contact support.' });
            }
            if (orderRecord.status === 'COMPLETED') {
                console.warn(`[SECURITY] store verify-payment rejected — already COMPLETED (replay). User: ${req.user.id}`);
                return res.status(409).json({ error: 'This payment has already been processed.' });
            }
            if (orderRecord.userId !== req.user.id) {
                console.warn(`[SECURITY] store verify-payment rejected — userId mismatch. Order owner: ${orderRecord.userId}, Requester: ${req.user.id}`);
                return res.status(403).json({ error: 'Payment order does not belong to this account.' });
            }
            if (orderRecord.paymentGateway !== gateway) {
                console.warn(`[SECURITY] store verify-payment rejected — gateway mismatch. Order: '${orderRecord.paymentGateway}', Request: '${gateway}'. User: ${req.user.id}`);
                return res.status(400).json({ error: 'Payment order not recognized. Please contact support.' });
            }

            const StoreItem = require('../models/StoreItem');
            const targetItem = await StoreItem.findByPk(itemId);
            if (!targetItem) return res.status(404).json({ error: `Store item not found.` });

            // Item-swap check: the order must be for exactly this item.
            // create-order records "Store: <name>" or "Store: <name> × <qty>" for seat packs.
            const unitPrice = parseFloat(targetItem.price);
            const expectedPlanName = `Store: ${targetItem.name}`;
            let purchaseQty = null;
            if (orderRecord.planName === expectedPlanName) {
                // Orders created before quantity was recorded: derive it from the charged amount
                const derived = unitPrice > 0 ? Math.round(parseFloat(orderRecord.amount) / unitPrice) : 1;
                purchaseQty = (targetItem.itemType === 'team_members' && derived > 1) ? derived : 1;
            } else if (orderRecord.planName && orderRecord.planName.startsWith(`${expectedPlanName} × `)) {
                const qtyStr = orderRecord.planName.slice(`${expectedPlanName} × `.length);
                if (/^\d+$/.test(qtyStr) && targetItem.itemType === 'team_members') purchaseQty = parseInt(qtyStr, 10);
            }
            if (!purchaseQty || purchaseQty < 1) {
                console.warn(`[SECURITY] store verify-payment rejected — item mismatch. Order: '${orderRecord.planName}', Request item: '${targetItem.name}'. User: ${req.user.id}`);
                return res.status(400).json({ error: 'Item mismatch detected. Please restart checkout.' });
            }

            // Optimistic lock: mark PROCESSING so concurrent requests cannot both pass the COMPLETED check
            const [lockedRows] = await Transaction.update(
                { status: 'PROCESSING' },
                { where: { transactionReference, status: orderRecord.status } }
            );
            if (lockedRows === 0) {
                console.warn(`[SECURITY] store verify-payment race condition blocked for txn '${transactionReference}'. User: ${req.user.id}`);
                return res.status(409).json({ error: 'Payment is already being processed. Please wait a moment.' });
            }
            // ─────────────────────────────────────────────────────────────────────

            const user = await User.findByPk(req.user.id);

            // Record Transaction with the amount the gateway was actually asked to charge
            const actualAmountPaid = parseFloat(orderRecord.amount) || 0;

            const txnData = {
                userId: user.id,
                amount: actualAmountPaid,
                currency: targetItem.currency || 'USD',
                planName: `Store: ${targetItem.name}${purchaseQty > 1 ? ` × ${purchaseQty}` : ''}`,
                status: 'COMPLETED',
                paymentGateway: gateway,
                transactionReference: transactionReference,
                razorpayOrderId: payload.razorpay_order_id || null,
                razorpayPaymentId: payload.razorpay_payment_id || null
            };

            const completedTxn = await orderRecord.update(txnData);

            // Grant Resource
            if (targetItem.itemType === 'ai_tokens') {
                user.aiTokenBalance = (user.aiTokenBalance || 0) + targetItem.amount;
            } else if (targetItem.itemType === 'messages') {
                if (user.extraTopupMessages === undefined) {
                    console.warn("User model missing extraTopupMessages field. Attempting to set anyway.");
                }
                user.extraTopupMessages = (user.extraTopupMessages || 0) + targetItem.amount;
            } else if (targetItem.itemType === 'contacts') {
                user.extraTopupContacts = (user.extraTopupContacts || 0) + targetItem.amount;
            } else if (targetItem.itemType === 'team_members') {
                const seatsGranted = targetItem.amount * purchaseQty;
                const months = parseInt(targetItem.validityMonths || 12, 10);
                user.extraTopupTeamMembers = (user.extraTopupTeamMembers || 0) + seatsGranted;
                // Extend expiry by validityMonths — stack from current if still valid, else from today
                const baseDate = (user.teamMemberTopupExpiry && new Date(user.teamMemberTopupExpiry) > new Date())
                    ? new Date(user.teamMemberTopupExpiry)
                    : new Date();
                baseDate.setMonth(baseDate.getMonth() + months);
                user.teamMemberTopupExpiry = baseDate;
                console.log(`[TEAM TOPUP] User ${user.id}: +${seatsGranted} seats for ${months} months (expiry → ${baseDate.toISOString()})`);
            }
            
            await user.save();
            
            // ≈≈ INVOICE GENERATION (Store/Top-up purchase) ≈≈
            try {
                const InvoiceService = require('../services/InvoiceService');
                await InvoiceService.generateAndDeliverInvoice(completedTxn.id);
            } catch (invoiceErr) {
                console.error('[INVOICE] Store/Topup invoice generation error:', invoiceErr.message);
            }

            // 🚨 ADMIN NOTIFICATION - PURCHASE MADE 🚨
            const amountPaidForStoreAlert = actualAmountPaid;
            try {
                await AdminNotification.create({
                    type: 'PLAN_CHANGE',
                    message: `Store Purchase: ${user.name} bought ${targetItem.name}`,
                    data: { userId: user.id, plan: targetItem.name, amount: amountPaidForStoreAlert }
                });
                await sendAdminAlert('purchase_made', `User ${user.name} purchased ${targetItem.name}`, {
                    name: user.name || 'Unknown',
                    plan: targetItem.name,
                    amount: amountPaidForStoreAlert.toString()
                });
            } catch (err) { console.error('Admin alert failed:', err); }

            return res.json({ success: true, message: `Successfully purchased ${targetItem.name}` });
            
        } else {
            // It's a Plan Upgrade

            // ─── CRIT-1 + CRIT-3 FIX: Validate the payment order against our own records ─────
            // 1. Confirm this orderId was actually created by our server (not fabricated)
            // 2. Confirm it has not already been used (replay attack prevention)
            // 3. Confirm the planName in the request matches what was ordered (plan-swap attack)
            const orderRecord = await Transaction.findOne({ where: { transactionReference } });
            if (!orderRecord) {
                console.warn(`[SECURITY] verify-payment rejected — transactionReference '${transactionReference}' not found in DB. Possible replay/fabrication. User: ${req.user.id}`);
                return res.status(400).json({ error: 'Payment order not recognized. Please contact support.' });
            }
            if (orderRecord.status === 'COMPLETED') {
                console.warn(`[SECURITY] verify-payment rejected — transactionReference '${transactionReference}' already COMPLETED. Possible replay attack. User: ${req.user.id}`);
                return res.status(409).json({ error: 'This payment has already been processed.' });
            }
            // Ownership: only the account that created the order can claim it
            if (orderRecord.userId !== req.user.id) {
                console.warn(`[SECURITY] verify-payment rejected — userId mismatch. Order owner: ${orderRecord.userId}, Requester: ${req.user.id}`);
                return res.status(403).json({ error: 'Payment order does not belong to this account.' });
            }
            if (orderRecord.paymentGateway !== gateway) {
                console.warn(`[SECURITY] verify-payment rejected — gateway mismatch. Order: '${orderRecord.paymentGateway}', Request: '${gateway}'. User: ${req.user.id}`);
                return res.status(400).json({ error: 'Payment order not recognized. Please contact support.' });
            }
            // Plan-swap check: body planName must match what was logged at create-order time
            if (orderRecord.planName !== planName) {
                console.warn(`[SECURITY] verify-payment rejected — planName mismatch. Order: '${orderRecord.planName}', Request: '${planName}'. User: ${req.user.id}`);
                return res.status(400).json({ error: 'Plan mismatch detected. Please restart checkout.' });
            }

            const targetPlan = await Plan.findOne({ where: { name: planName } });
            if (!targetPlan) return res.status(404).json({ error: `Plan '${planName}' not found.` });

            // Use the interval recorded at order-creation time — never the body value.
            // Re-resolve it so an order carrying an interval that is not sold (e.g. 'lifetime')
            // can never grant a longer plan than was paid for.
            const pricing = resolvePlanPricing(targetPlan, orderRecord.billingInterval || 'month');
            if (!pricing) {
                console.warn(`[SECURITY] verify-payment rejected — order interval '${orderRecord.billingInterval}' is not sold for plan '${planName}'. User: ${req.user.id}`);
                try {
                    await AdminNotification.create({
                        type: 'SYSTEM_ERROR',
                        message: `Payment needs review: ${planName} order ${transactionReference} (₹${orderRecord.amount}) has billing period '${orderRecord.billingInterval}', which this plan does not sell. Plan was NOT activated.`,
                        data: { userId: req.user.id, plan: planName, transactionReference }
                    });
                } catch (_) {}
                return res.status(400).json({ error: 'This billing period is not available for this plan. Please contact support.' });
            }
            targetPlan.price = pricing.price;
            targetPlan.interval = pricing.interval;

            // Coupon + discount come from the order record, never from the request body
            const orderCouponCode = orderRecord.couponCode || null;
            const orderDiscount = Math.max(0, parseFloat(orderRecord.discountApplied) || 0);

            // ─── HIGH-1 FIX: Optimistic lock — mark PROCESSING before any work ──────────────
            // This prevents a race condition where two concurrent verify-payment calls both
            // pass the COMPLETED check above and both call applyUpgrade.
            const [updatedRows] = await Transaction.update(
                { status: 'PROCESSING' },
                { where: { transactionReference, status: 'FAILED' } }  // only update if still FAILED
            );
            if (updatedRows === 0) {
                // Another request already grabbed this order — it's either PROCESSING or COMPLETED
                console.warn(`[SECURITY] verify-payment race condition blocked for txn '${transactionReference}'. User: ${req.user.id}`);
                return res.status(409).json({ error: 'Payment is already being processed. Please wait a moment.' });
            }
            // ─────────────────────────────────────────────────────────────────────────────────

            // ─── HIGH-2 FIX: Re-validate coupon before incrementing usesCount ─────────────
            // At create-order the coupon was valid. By verify-payment time it may have:
            //   - expired (expiryDate passed)  
            //   - hit its maxUses limit (race between two users)
            //   - been deactivated by admin
            // We still complete the payment (Razorpay already charged the user), but we
            // log a revenue alert so admin is aware the discount was applied on a stale coupon.
            if (orderCouponCode) {
                const coupon = await Coupon.findOne({ where: { code: orderCouponCode.toUpperCase() } });
                if (coupon) {
                    const now = new Date();
                    const couponStillValid = coupon.isActive
                        && (!coupon.expiryDate || new Date(coupon.expiryDate) >= now)
                        && (coupon.maxUses <= 0 || coupon.usesCount < coupon.maxUses);
                    if (couponStillValid) {
                        await coupon.increment('usesCount', { by: 1 });
                    } else {
                        // Coupon no longer valid — log for admin review but do NOT block payment
                        console.warn(`[BILLING] Coupon '${orderCouponCode}' was invalid at verify-payment time (expired/maxed/inactive). Payment still completed. User: ${req.user.id}`);
                        try {
                            await AdminNotification.create({
                                type: 'SYSTEM_ERROR',
                                message: `Revenue alert: Coupon '${orderCouponCode}' was stale at verification for user ${req.user.id} (${planName}). Discount was applied but coupon is now invalid.`,
                                data: { userId: req.user.id, couponCode: orderCouponCode, planName }
                            });
                        } catch (_) {}
                    }
                }
            }

            // ─── Convert pending manual payment if user already submitted one ─────────────────
            // CASE 1: Same plan — convert the row in-place to the online payment details.
            //         This avoids a duplicate transaction and clears the approval queue automatically.
            // CASE 2: Different plan — the old manual request becomes stale/irrelevant because the
            //         user clearly changed their mind. Auto-cancel it so the superadmin never sees
            //         it and can't accidentally approve it (which would downgrade the user).
            const pendingManualSamePlan = await Transaction.findOne({
                where: {
                    userId: req.user.id,
                    planName,
                    status: 'PENDING_APPROVAL',
                    paymentGateway: 'manual'
                }
            });

            if (pendingManualSamePlan) {
                // ── Same plan: convert in-place ────────────────────────────────────────────────
                const actualAmountPaidConverted = parseFloat(orderRecord.amount) || 0;
                await pendingManualSamePlan.update({
                    paymentGateway: gateway,
                    transactionReference,
                    razorpayOrderId: payload.razorpay_order_id || null,
                    razorpayPaymentId: payload.razorpay_payment_id || null,
                    couponCode: orderCouponCode,
                    discountApplied: orderDiscount,
                    amount: actualAmountPaidConverted,
                    manualPaymentRef: null,  // clear UTR — not relevant for online payment
                    manualPaymentNote: null,
                    status: 'COMPLETED',
                    isRead: false  // mark unread so admin sees the conversion in their queue
                });
                // Override transactionReference so applyUpgrade finds & updates this row (not new one)
                transactionReference = pendingManualSamePlan.transactionReference;
                console.log(`[BILLING] Converted pending manual txn ${pendingManualSamePlan.id} → online (${gateway}) for user ${req.user.id} plan ${planName}`);
            }

            // ── Different plan: cancel all other stale pending manual requests ───────────────
            // User switched to a different plan — kill any pending manual requests for other plans
            // so superadmin can't accidentally approve a stale request and downgrade/alter the user.
            const stalePendingManuals = await Transaction.findAll({
                where: {
                    userId: req.user.id,
                    planName: { [Op.ne]: planName },  // different plan
                    status: 'PENDING_APPROVAL',
                    paymentGateway: 'manual'
                }
            });
            if (stalePendingManuals.length > 0) {
                for (const stale of stalePendingManuals) {
                    await stale.update({
                        status: 'REJECTED',
                        manualPaymentNote: (stale.manualPaymentNote ? stale.manualPaymentNote + '\n' : '') +
                            `[Auto-cancelled: user completed online payment for ${planName} on ${new Date().toISOString()}]`,
                        isRead: false  // surface it to admin so they're aware
                    });
                    console.log(`[BILLING] Auto-cancelled stale manual txn ${stale.id} (plan: ${stale.planName}) because user paid online for ${planName}`);
                }
            }
            // ─────────────────────────────────────────────────────────────────────────────────

            // Bug #5 FIX: Use the actual charged amount from the pre-logged FAILED transaction
            // (created at create-order time with the exact finalPriceToCharge Razorpay was given).
            // Recalculating here with plan.price - couponDiscount ignores upgrade credits and
            // any other server-side adjustments, leading to an inflated amountPaid in the audit log.
            const actualAmountCharged = parseFloat(orderRecord.amount) || 0;

            const upgradeResult = await applyUpgrade(req.user.id, targetPlan, {
                paymentGateway: gateway,
                transactionReference: transactionReference,
                razorpayOrderId: payload.razorpay_order_id || null,
                razorpayPaymentId: payload.razorpay_payment_id || null,
                couponCode: orderCouponCode,
                discountApplied: orderDiscount,   // ← from our order record; feeds partner commission maths
                amountPaid: actualAmountCharged   // ← exact amount the gateway charged, never recalculated
            });

            // ─── Trigger WhatsApp Plan Purchase Notification ───
            try {
                const SystemConfig = require('../models/SystemConfig');
                const Settings = require('../models/Settings');
                const { sendSystemMessage } = require('../services/systemMessenger');

                const config = await SystemConfig.getCachedConfig();
                const linkedAdminId = config?.settings?.linkedAdminUserId;
                if (linkedAdminId) {
                    const adminSettings = await Settings.findOne({ where: { userId: linkedAdminId } });
                    const waTemplates = adminSettings?.notificationTemplates?.whatsapp || {};
                    const planPurchaseTpl = waTemplates.planPurchase;

                    if (planPurchaseTpl && planPurchaseTpl.enabled && req.user.phone) {
                        const userPhone = req.user.phone.replace(/\D/g, '');
                        const newExpiry = upgradeResult?.newExpiry;
                        // Use the actual charged amount (resolved above) for the notification
                        const contextMap = {
                            '{name}': req.user.name || 'User',
                            '{plan_name}': targetPlan.name || 'Plan',
                            '{amount}': `${actualAmountCharged}`,   // ✅ Actual paid amount — consistent with transaction record
                            '{transaction_id}': transactionReference || 'N/A',
                            // Use newly computed expiry (not old JWT session expiry)
                            '{expiry_date}': new Date(newExpiry || req.user.planExpiry || Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()
                        };

                        let parameters = [];
                        if (planPurchaseTpl.selectedVariables && planPurchaseTpl.selectedVariables.length > 0) {
                            parameters = planPurchaseTpl.selectedVariables.map(v => ({
                                type: 'text',
                                text: contextMap[v] || 'N/A'
                            }));
                        } else {
                            parameters = [
                                { type: 'text', text: req.user.name || 'User' },
                                { type: 'text', text: targetPlan.name || 'Plan' },
                                { type: 'text', text: `${parseFloat(targetPlan.price)}` },
                                { type: 'text', text: transactionReference || 'N/A' },
                                { type: 'text', text: new Date(newExpiry || req.user.planExpiry || Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString() }
                            ];
                        }

                        // Available Variables: {name}, {plan_name}, {amount}, {transaction_id}, {expiry_date}
                        await sendSystemMessage(userPhone, 'template', {
                            templateName: planPurchaseTpl.templateName,
                            languageCode: planPurchaseTpl.languageCode || 'en_US',
                            components: [{
                                type: 'body',
                                parameters: parameters
                            }]
                        });
                    }
                }
            } catch (notifyErr) {
                console.error('[PLAN PURCHASE NOTIFICATION ERROR]', notifyErr);
            }

            // ≈≈ INVOICE GENERATION (Plan purchase) ≈≈
            try {
                const InvoiceService = require('../services/InvoiceService');
                const planTxn = await Transaction.findOne({
                    where: { transactionReference },
                    order: [['createdAt', 'DESC']]
                });
                if (planTxn) {
                    await InvoiceService.generateAndDeliverInvoice(planTxn.id);
                }
            } catch (invoiceErr) {
                console.error('[INVOICE] Plan invoice generation error:', invoiceErr.message);
            }

            // 🚨 ADMIN NOTIFICATION - PURCHASE MADE 🚨
            // MED-1 FIX: Use actualAmountCharged (resolved from pre-logged txn) not a recalculation
            const userForPlanAlert = await User.findByPk(req.user.id);
            try {
                await AdminNotification.create({
                    type: 'PLAN_CHANGE',
                    message: `Plan Upgrade: ${userForPlanAlert.name} upgraded to ${planName} (₹${actualAmountCharged})`,
                    data: { userId: userForPlanAlert.id, plan: planName, amount: actualAmountCharged }
                });
                await sendAdminAlert('purchase_made', `User ${userForPlanAlert.name} purchased ${planName}`, {
                    name: userForPlanAlert.name || 'Unknown',
                    plan: planName,
                    amount: actualAmountCharged.toString()
                });
            } catch (err) { console.error('Admin alert failed:', err); }

            return res.json({ success: true, message: `Successfully upgraded to ${planName}` });
        }
    } catch (err) {
        console.error('Verify Payment Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// POST /upgrade — SUPERADMIN ONLY (CRIT-2 FIX)
// This route bypasses payment verification entirely and must NEVER be accessible to regular users.
// Only superadmins can use it to manually grant plan access (e.g., for comped accounts, migrations).
router.post('/upgrade', adminMiddleware, async (req, res) => {
    try {
        const { planName, interval } = req.body;
        const targetPlan = await Plan.findOne({ where: { name: planName } });
        if (!targetPlan) return res.status(404).json({ error: `Plan '${planName}' not found.` });

        // Override price and interval based on selection
        if (interval === 'month' && targetPlan.monthlyPrice > 0) targetPlan.price = targetPlan.monthlyPrice;
        else if (interval === 'half-year' && targetPlan.halfYearlyPrice > 0) targetPlan.price = targetPlan.halfYearlyPrice;
        else if (interval === 'year' && targetPlan.yearlyPrice > 0) targetPlan.price = targetPlan.yearlyPrice;
        if (interval) targetPlan.interval = interval;

        await applyUpgrade(req.user.id, targetPlan, { paymentGateway: 'admin_grant', amountPaid: 0 });
        console.log(`[SECURITY] Admin ${req.user.id} manually granted ${planName} via /upgrade endpoint`);
        res.json({ success: true, message: `Upgraded to ${planName}` });
    } catch (err) {
        console.error('Upgrade Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// POST /downgrade-to-free - User voluntarily cancels and drops to Free
router.post('/downgrade-to-free', async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const previousPlan = user.plan;
        const previousExpiry = user.planExpiry;

        await user.update({
            plan: 'Free',
            planStatus: 'Active',
            planExpiry: null
        });

        // MED-2 FIX: Log cancellation as a transaction record and alert admin
        // Prevents silent cancellation via CSRF/XSS and gives admin visibility
        try {
            await Transaction.create({
                userId: user.id,
                amount: 0,
                currency: 'INR',
                planName: 'Free',
                status: 'COMPLETED',
                paymentGateway: 'system',
                transactionReference: `downgrade_${Date.now()}`,
                userName: user.name || null,
                userEmail: user.email || null,
                userPhone: user.phone || null,
                manualPaymentNote: `User voluntarily downgraded from ${previousPlan} (expiry: ${previousExpiry ? new Date(previousExpiry).toISOString() : 'none'})`
            });
            await AdminNotification.create({
                type: 'PLAN_CHANGE',
                message: `Plan Cancellation: ${user.name || user.email} downgraded from ${previousPlan} to Free (had expiry: ${previousExpiry ? new Date(previousExpiry).toLocaleDateString() : 'none'})`,
                data: { userId: user.id, previousPlan, previousExpiry }
            });
        } catch (logErr) {
            console.error('[BILLING] Failed to log downgrade event:', logErr.message);
        }

        res.json({ success: true, message: 'Downgraded to Free plan' });
    } catch (err) {
        console.error('Downgrade Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// POST /start-trial - Start trial for a specific plan
router.post('/start-trial', async (req, res) => {
    try {
        const { planName } = req.body;
        const targetPlan = await Plan.findOne({ where: { name: planName } });
        
        if (!targetPlan) {
            return res.status(404).json({ error: `Plan '${planName}' not found.` });
        }

        const user = await User.findByPk(req.user.id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        if (!isPlanPurchasable(targetPlan, user)) {
            console.warn(`[SECURITY] start-trial blocked — plan '${planName}' is not available. User: ${req.user.id}`);
            return res.status(404).json({ error: `Plan '${planName}' not found.` });
        }

        if (!targetPlan.trialDays || targetPlan.trialDays <= 0) {
            return res.status(400).json({ error: `Plan '${planName}' does not offer a free trial.` });
        }

        if (user.hasUsedTrial) {
            return res.status(403).json({ error: 'You have already used a free trial on this account.' });
        }

        if (user.planStatus === 'Active' && user.plan !== 'Free') {
            return res.status(403).json({ error: 'Cannot start a trial while on an active paid subscription.' });
        }
        
        let planExpiry = new Date();
        planExpiry.setDate(planExpiry.getDate() + targetPlan.trialDays);

        await user.update({
            plan: targetPlan.name,
            planStatus: 'Trial',
            planExpiry: planExpiry,
            hasUsedTrial: true
        });

        res.json({ success: true, message: `Started ${targetPlan.trialDays}-day free trial for ${planName} plan` });
    } catch (err) {
        console.error('Start Trial Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ─── GET /pending-manual-request ── Fetch user's pending manual payment ────────
router.get('/pending-manual-request', async (req, res) => {
    try {
        const pendingReq = await Transaction.findOne({
            where: { userId: req.user.id, status: 'PENDING_APPROVAL', paymentGateway: 'manual' },
            order: [['createdAt', 'DESC']]
        });
        res.json({ pendingRequest: pendingReq });
    } catch (err) {
        console.error('Get Pending Manual Request Error:', err);
        res.status(500).json({ error: 'Server Error' });
    }
});

// ─── PUT /manual-payment-request/:id ── Edit a pending manual payment ────────
router.put('/manual-payment-request/:id', async (req, res) => {
    try {
        const { utrNumber, note, screenshotUrls } = req.body;
        const transactionId = req.params.id;

        const txn = await Transaction.findOne({
            where: { id: transactionId, userId: req.user.id, status: 'PENDING_APPROVAL', paymentGateway: 'manual' }
        });

        if (!txn) {
            return res.status(404).json({ error: 'Pending manual payment request not found.' });
        }

        if (utrNumber !== undefined && utrNumber.trim() && !/^[A-Za-z0-9]{8,30}$/.test(utrNumber.trim())) {
            return res.status(400).json({ error: 'Invalid UTR format. Must be 8–30 alphanumeric characters.' });
        }

        if (utrNumber !== undefined) txn.manualPaymentRef = utrNumber.trim() || null;
        if (note !== undefined) txn.manualPaymentNote = note ? note.trim() : null;
        if (screenshotUrls !== undefined) {
            txn.paymentScreenshotUrls = Array.isArray(screenshotUrls) ? screenshotUrls : (screenshotUrls ? [screenshotUrls] : []);
        }

        await txn.save();
        res.json({ success: true, message: 'Manual payment request updated successfully.', transaction: txn });
    } catch (err) {
        console.error('Update Manual Payment Request Error:', err);
        res.status(500).json({ error: 'Server Error' });
    }
});

// ─── DELETE /manual-payment-request/:id ── Cancel a pending manual payment ────
router.delete('/manual-payment-request/:id', async (req, res) => {
    try {
        const transactionId = req.params.id;

        const txn = await Transaction.findOne({
            where: { id: transactionId, userId: req.user.id, status: 'PENDING_APPROVAL', paymentGateway: 'manual' }
        });

        if (!txn) {
            return res.status(404).json({ error: 'Pending manual payment request not found.' });
        }

        await txn.destroy();
        res.json({ success: true, message: 'Manual payment request cancelled.' });
    } catch (err) {
        console.error('Cancel Manual Payment Request Error:', err);
        res.status(500).json({ error: 'Server Error' });
    }
});

// ─── POST /manual-payment-request ── User submits bank transfer ───────────────
router.post('/manual-payment-request', async (req, res) => {
    try {
        const { planName, interval, couponCode, utrNumber, note, screenshotUrls } = req.body;

        if (!planName) return res.status(400).json({ error: 'Plan name is required.' });
        if (!screenshotUrls || (Array.isArray(screenshotUrls) && screenshotUrls.length === 0)) {
            return res.status(400).json({ error: 'Payment screenshot is required.' });
        }
        if (utrNumber && utrNumber.trim() && !/^[A-Za-z0-9]{8,30}$/.test(utrNumber.trim())) {
            return res.status(400).json({ error: 'Invalid UTR format. Must be 8–30 alphanumeric characters (no spaces or special characters).' });
        }

        let targetPlan = await Plan.findOne({ where: { name: planName } });
        if (!targetPlan) return res.status(404).json({ error: `Plan '${planName}' not found.` });

        const user = await User.findByPk(req.user.id);

        if (!isPlanPurchasable(targetPlan, user)) {
            console.warn(`[SECURITY] manual-payment-request blocked — plan '${planName}' is not purchasable. User: ${req.user.id}`);
            return res.status(404).json({ error: `Plan '${planName}' not found.` });
        }

        // Same price + duration rules as online checkout
        const pricing = resolvePlanPricing(targetPlan, interval);
        if (!pricing) return res.status(400).json({ error: 'This billing period is not available for this plan.' });
        targetPlan.price = pricing.price;
        targetPlan.interval = pricing.interval;

        // Calculate final price (upgrade credit + coupon)
        let finalPrice = parseFloat(targetPlan.price);
        let appliedDiscount = 0;
        let appliedCouponCode = null;

        const isUpgrade = user.planStatus === 'Active' && user.planExpiry && user.plan !== 'Free';
        let upgradeCreditApplied = false;
        if (isUpgrade) {
            const math = await calculateUpgradeDiscount(user, targetPlan);
            finalPrice = math.finalPrice;
            upgradeCreditApplied = math.creditAmount > 0;
        }

        // Same coupon rules as online checkout (dates, limits, plan, interval, emails, partner cap).
        // "Upgrade" here means an upgrade credit was applied — same meaning as the online checkout page.
        const couponResult = await evaluatePlanCoupon({
            couponCode,
            user,
            planName,
            interval: targetPlan.interval,
            listPrice: targetPlan.price,
            baseAmount: finalPrice,
            isUpgrade: upgradeCreditApplied
        });
        if (couponResult) {
            appliedDiscount = couponResult.discount;
            appliedCouponCode = couponResult.coupon.code;
            finalPrice = Math.round((finalPrice - appliedDiscount) * 100) / 100;
        }

        // Block if user has ANY existing pending or in-flight manual payment request.
        // Previously this only blocked same planName+interval, which allowed a user to submit
        // a second request for a different plan/interval while their first was still PENDING —
        // the exact scenario that caused double-requests in the admin queue.
        // A user can only have ONE pending manual request at a time. To switch plans, they
        // must cancel the existing request first.
        const existing = await Transaction.findOne({
            where: {
                userId: req.user.id,
                status: ['PENDING_APPROVAL', 'LOCKED'],
                paymentGateway: 'manual'
            }
        });
        if (existing) {
            if (existing.status === 'LOCKED') {
                return res.status(409).json({ error: 'A payment request is currently being processed by our team. Please wait.' });
            }
            const isSamePlan = existing.planName === planName && (existing.billingInterval || 'month') === (interval || 'month');
            if (isSamePlan) {
                return res.status(409).json({ error: 'You already have a pending payment request for this plan. Please wait for admin approval or cancel it first.' });
            }
            // Different plan — give a clear message that they must cancel the old one first
            return res.status(409).json({
                error: `You already have a pending payment request for the ${existing.planName} plan. Please cancel it first before submitting a new request.`,
                existingPlanName: existing.planName,
                existingTxnId: existing.id
            });
        }

        // Calculate upgrade credit for tracking purposes
        let upgradeCredit = 0;
        if (isUpgrade) {
            const fullIntervalPrice = parseFloat(targetPlan.price); // price already set to interval price above
            upgradeCredit = Math.max(0, fullIntervalPrice - (finalPrice + appliedDiscount));
        }

        // Generate unique short reference ID for user-facing display (e.g. "A3X7K2M" → "BT-A3X7K2M")
        const shortId = await generateShortId();

        // Create PENDING_APPROVAL transaction — store billingInterval so approval never has to infer it
        const txn = await Transaction.create({
            userId: req.user.id,
            amount: finalPrice,
            currency: targetPlan.currency || 'INR',
            planName,
            billingInterval: targetPlan.interval, // resolved + validated interval (never a raw body value)
            status: 'PENDING_APPROVAL',
            paymentGateway: 'manual',
            transactionReference: `manual_${crypto.randomUUID().replace(/-/g, '')}`,
            userName: user.name || null,
            userEmail: user.email || null,
            userPhone: user.phone || null,
            couponCode: appliedCouponCode,
            discountApplied: appliedDiscount || 0,
            upgradeCredit: upgradeCredit || 0, // Bug #2 fix: track upgrade credit separately
            manualPaymentRef: utrNumber ? utrNumber.trim() : null,
            manualPaymentNote: note ? note.trim() : null,
            paymentScreenshotUrls: Array.isArray(screenshotUrls) ? screenshotUrls : (screenshotUrls ? [screenshotUrls] : []),
            isRead: false,
            shortId  // ← unique random short ID for user-facing reference
        });

        // Admin notification
        try {
            const utrDisplay = utrNumber ? utrNumber.trim() : 'N/A'; // Bug #3 fix: guard null utrNumber
            await AdminNotification.create({
                type: 'PLAN_CHANGE',
                message: `Manual Payment Request: ${user.name || user.email} submitted UTR ${utrDisplay} for ${planName} (${interval || 'monthly'}) plan (₹${finalPrice})`,
                data: { userId: req.user.id, plan: planName, amount: finalPrice, txnId: txn.id }
            });
            await sendAdminAlert('purchase_made', `New manual payment request from ${user.name || user.email}`, {
                name: user.name || 'User',
                plan: planName,
                amount: finalPrice.toString()
            });
        } catch (alertErr) {
            console.error('[MANUAL PAYMENT] Admin alert error:', alertErr.message);
        }

        res.json({ success: true, message: 'Your payment request has been submitted. We will verify and activate your plan within 24 hours.', txnId: txn.id, shortId: txn.shortId });
    } catch (err) {
        console.error('Manual Payment Request Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ─── POST /approve-manual-payment/:transactionId ── Admin approves ────────────
router.post('/approve-manual-payment/:transactionId', adminMiddleware, async (req, res) => {
    try {
        const txn = await Transaction.findByPk(req.params.transactionId);
        if (!txn) return res.status(404).json({ error: 'Transaction not found.' });
        if (txn.status !== 'PENDING_APPROVAL') return res.status(400).json({ error: 'This transaction is not pending approval.' });
        if (txn.paymentGateway !== 'manual') return res.status(400).json({ error: 'This is not a manual payment transaction.' });

        // ─── RACE CONDITION FIX: Atomically lock this transaction before any work ──────
        // If admin A and admin B both click Approve simultaneously, only one UPDATE
        // WHERE status='PENDING_APPROVAL' will succeed. The other gets updatedRows=0 → 409.
        // This also blocks the user from submitting a NEW request for the same plan while
        // approval is in-flight (the POST /manual-payment-request route checks for LOCKED).
        const [lockedRows] = await Transaction.update(
            { status: 'LOCKED' },
            { where: { id: txn.id, status: 'PENDING_APPROVAL' } }
        );
        if (lockedRows === 0) {
            // Another admin already grabbed it, or the user's request state changed concurrently
            return res.status(409).json({ error: 'This request is already being processed or was just modified. Please refresh.' });
        }
        // ─────────────────────────────────────────────────────────────────────────────────

        let targetPlan = await Plan.findOne({ where: { name: txn.planName } });
        if (!targetPlan) {
            // If plan lookup fails, revert lock so admin can retry
            await txn.update({ status: 'PENDING_APPROVAL' });
            return res.status(404).json({ error: `Plan '${txn.planName}' not found.` });
        }

        // Bug #1 FIX: Use the billingInterval stored at submission time — never infer from amount.
        const resolvedInterval = txn.billingInterval || (() => {
            if (targetPlan.yearlyPrice > 0 && Math.abs(parseFloat(txn.amount) - parseFloat(targetPlan.yearlyPrice)) < 1) return 'year';
            if (targetPlan.halfYearlyPrice > 0 && Math.abs(parseFloat(txn.amount) - parseFloat(targetPlan.halfYearlyPrice)) < 1) return 'half-year';
            return 'month';
        })();

        // Re-check the stored interval: requests submitted before this check existed may carry
        // an interval the plan does not sell (e.g. 'lifetime' for a monthly price).
        const approvedPricing = resolvePlanPricing(targetPlan, resolvedInterval);
        if (!approvedPricing) {
            await txn.update({ status: 'PENDING_APPROVAL' });
            return res.status(400).json({ error: `This request has billing period '${resolvedInterval}', which the ${txn.planName} plan does not sell. Reject it and ask the user to submit a new request.` });
        }
        targetPlan.price = approvedPricing.price;
        targetPlan.interval = approvedPricing.interval;

        // Update coupon usage if applicable
        if (txn.couponCode) {
            const coupon = await Coupon.findOne({ where: { code: txn.couponCode.toUpperCase() } });
            if (coupon) await coupon.increment('usesCount', { by: 1 });
        }

        // Reuse full applyUpgrade() — this does plan assignment, addons, CRM tags, referrals, tech partner
        const upgradeResult = await applyUpgrade(txn.userId, targetPlan, {
            paymentGateway: 'manual',
            transactionReference: txn.transactionReference,
            couponCode: txn.couponCode || null,
            discountApplied: txn.discountApplied || 0,
            amountPaid: parseFloat(txn.amount)
        });

        // Mark the LOCKED transaction as COMPLETED
        await txn.update({ status: 'COMPLETED', isRead: true });

        // ─── Cancel any NEW requests the user submitted DURING the approval window ──────
        // Scenario: User had request X (PENDING). Admin started approving X (now LOCKED→COMPLETED).
        // While admin was approving, user created request Y (PENDING, different plan or same plan).
        // We now cancel Y so admin doesn't accidentally approve it and double-grant the user.
        try {
            const newRequestsDuringApproval = await Transaction.findAll({
                where: {
                    userId: txn.userId,
                    id: { [Op.ne]: txn.id },        // not the one we just approved
                    status: 'PENDING_APPROVAL',
                    paymentGateway: 'manual'
                }
            });
            for (const stale of newRequestsDuringApproval) {
                await stale.update({
                    status: 'REJECTED',
                    isRead: false,  // surface to admin so they see it was auto-cancelled
                    manualPaymentNote: (stale.manualPaymentNote ? stale.manualPaymentNote + '\n' : '') +
                        `[Auto-cancelled: User's ${txn.planName} (${resolvedInterval}) plan was approved while this request was pending on ${new Date().toISOString()}]`
                });
                console.log(`[BILLING] Auto-cancelled stale manual request ${stale.id} (${stale.planName}) after approving ${txn.id} for user ${txn.userId}`);
            }
        } catch (cleanupErr) {
            console.error('[BILLING] Failed to clean up stale requests after approval:', cleanupErr.message);
        }
        // ─────────────────────────────────────────────────────────────────────────────────

        // Generate invoice
        try {
            const InvoiceService = require('../services/InvoiceService');
            await InvoiceService.generateAndDeliverInvoice(txn.id);
        } catch (invoiceErr) {
            console.error('[MANUAL PAYMENT APPROVE] Invoice error:', invoiceErr.message);
        }

        // WA notification to user
        try {
            const { sendSystemMessage } = require('../services/systemMessenger');
            const config = await SystemConfig.getCachedConfig();
            const linkedAdminId = config?.settings?.linkedAdminUserId;
            if (linkedAdminId) {
                const Settings = require('../models/Settings');
                const adminSettings = await Settings.findOne({ where: { userId: linkedAdminId } });
                const waTemplates = adminSettings?.notificationTemplates?.whatsapp || {};
                const planPurchaseTpl = waTemplates.planPurchase;
                const user = await User.findByPk(txn.userId);

                if (planPurchaseTpl && planPurchaseTpl.enabled && user?.phone) {
                    const userPhone = user.phone.replace(/\D/g, '');
                    const newExpiry = upgradeResult?.newExpiry;
                    const contextMap = {
                        '{name}': user.name || 'User',
                        '{plan_name}': targetPlan.name,
                        '{amount}': `${parseFloat(txn.amount)}`,
                        '{transaction_id}': txn.manualPaymentRef || txn.transactionReference || 'N/A',
                        '{expiry_date}': new Date(newExpiry || Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()
                    };
                    const parameters = (planPurchaseTpl.selectedVariables?.length > 0)
                        ? planPurchaseTpl.selectedVariables.map(v => ({ type: 'text', text: contextMap[v] || 'N/A' }))
                        : [
                            { type: 'text', text: user.name || 'User' },
                            { type: 'text', text: targetPlan.name },
                            { type: 'text', text: `${parseFloat(txn.amount)}` },
                            { type: 'text', text: txn.manualPaymentRef || 'N/A' },
                            { type: 'text', text: new Date(newExpiry || Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString() }
                        ];
                    await sendSystemMessage(userPhone, 'template', {
                        templateName: planPurchaseTpl.templateName,
                        languageCode: planPurchaseTpl.languageCode || 'en_US',
                        components: [{ type: 'body', parameters }]
                    });
                }
            }
        } catch (waErr) {
            console.error('[MANUAL PAYMENT APPROVE] WA notification error:', waErr.message);
        }

        res.json({ success: true, message: `Payment approved. ${txn.planName} plan activated for user.` });
    } catch (err) {
        // If anything threw after LOCKED but before COMPLETED, revert to PENDING_APPROVAL so admin can retry
        try {
            const txnToRevert = await Transaction.findByPk(req.params.transactionId);
            if (txnToRevert && txnToRevert.status === 'LOCKED') {
                await txnToRevert.update({ status: 'PENDING_APPROVAL' });
                console.error('[BILLING] Reverted LOCKED txn back to PENDING_APPROVAL after error:', req.params.transactionId);
            }
        } catch (_) {}
        console.error('Approve Manual Payment Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ─── POST /reject-manual-payment/:transactionId ── Admin rejects ──────────────
router.post('/reject-manual-payment/:transactionId', adminMiddleware, async (req, res) => {
    try {
        const { reason } = req.body;
        const txn = await Transaction.findByPk(req.params.transactionId);
        if (!txn) return res.status(404).json({ error: 'Transaction not found.' });
        if (txn.status !== 'PENDING_APPROVAL') return res.status(400).json({ error: 'This transaction is not pending approval.' });

        await txn.update({
            status: 'REJECTED',
            isRead: true,
            manualPaymentNote: reason ? `REJECTED: ${reason}` : (txn.manualPaymentNote ? `REJECTED: ${txn.manualPaymentNote}` : 'REJECTED')
        });

        res.json({ success: true, message: 'Payment request rejected.' });
    } catch (err) {
        console.error('Reject Manual Payment Error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
