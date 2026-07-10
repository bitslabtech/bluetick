const express = require('express');
const router = express.Router();
const { authLimiter } = require('../middleware/rateLimiter');
const verifyTurnstile = require('../middleware/turnstile');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Settings = require('../models/Settings');
const AdminNotification = require('../models/AdminNotification');
const SystemConfig = require('../models/SystemConfig');
const otpStore = require('../utils/otpStore');

const logActivity = require('../utils/logger');
const { sendSystemMessage } = require('../services/systemMessenger');
const { setAuthCookies, clearAuthCookies } = require('../utils/cookieHelper');

// Generate Token Helper
const generateToken = (user) => {
    const payload = {
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            isAdmin: user.isAdmin // Include isAdmin
        }
    };
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h', algorithm: 'HS256' });
};

/**
 * GET OTP Config from SystemConfig.
 * Returns the whatsappOtp settings block with safe defaults.
 */
const getOtpConfig = async () => {
    let cfg = {};
    const adminUser = await User.findOne({ where: { isAdmin: true } });
    if (adminUser) {
        const settings = await Settings.findOne({ where: { userId: adminUser.id } });
        cfg = settings?.securityConfig?.whatsappOtp || {};
    }
    return {
        enabled: cfg.enabled === true,
        otpExpirySec: cfg.otpExpirySec || 300,
        resendCooldownSec: cfg.resendCooldownSec || 60,
        maxResendPerHour: cfg.maxResendPerHour || 3,
        maxVerifyAttempts: cfg.maxVerifyAttempts || 5,
        // Template mode: when set, uses an approved Meta template to send OTP.
        // Required for reaching new users who haven't messaged the business number
        // in the last 24 hours (Meta enforces the session window for free-form text).
        // Leave empty to fall back to plain text (only works within 24h session).
        templateName: cfg.templateName || '',       // e.g. 'otp_verification'
        templateLanguage: cfg.templateLanguage || 'en',  // template language code
        // OTP variable position in template body — default {{1}}
        otpVariableIndex: cfg.otpVariableIndex || 1,
        // Plain text fallback message (used when templateName is empty)
        messageTemplate: cfg.messageTemplate ||
            'Your {{appName}} verification code is *{{otp}}*. Valid for {{minutes}} minutes. Do not share this code with anyone.'
    };
};

// ─────────────────────────────────────────────────────────────────────────────
// SEND OTP  —  POST /api/auth/send-otp
// Sends a WhatsApp OTP to the given phone number with full anti-abuse protection.
// Supports two modes:
//   1. Template mode (recommended) — uses an approved Meta WhatsApp template.
//      Required for new users who haven't messaged your number in the last 24h.
//   2. Text mode (fallback) — plain text message. Only works within a 24h
//      conversation window; Meta will reject it for cold outbound.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/send-otp', authLimiter, async (req, res) => {
    try {
        const { phone } = req.body;

        if (!phone) {
            return res.status(400).json({ error: 'Phone number is required.' });
        }

        const otpConfig = await getOtpConfig();

        if (!otpConfig.enabled) {
            return res.status(400).json({ error: 'WhatsApp OTP verification is not enabled.' });
        }

        const normalized = otpStore.normalizePhone(phone);
        if (normalized.length < 7) {
            return res.status(400).json({ error: 'Invalid phone number.' });
        }

        // ── Rate limit check ──
        const limitCheck = otpStore.checkSendLimits(normalized, otpConfig);
        if (!limitCheck.allowed) {
            return res.status(429).json({
                error: limitCheck.reason,
                retryAfterSec: limitCheck.retryAfterSec
            });
        }

        // ── Generate OTP ──
        const otp = otpStore.createOtp(normalized, otpConfig);

        const sysConfig = await SystemConfig.getCachedConfig();
        const appName = sysConfig?.settings?.appName || 'Bluetick';
        const minutes = Math.ceil(otpConfig.otpExpirySec / 60);

        let result;

        if (otpConfig.templateName) {
            // ── TEMPLATE MODE (recommended for cold outbound) ──
            // Build component parameters: the OTP goes into the body variable position.
            // Standard authentication templates have one body variable: {{1}} = OTP code.
            const varIndex = (otpConfig.otpVariableIndex || 1) - 1; // 0-indexed
            const bodyParams = [];
            // Fill slots up to the OTP position with empty strings, then place the OTP
            for (let i = 0; i < varIndex; i++) bodyParams.push({ type: 'text', text: '' });
            bodyParams.push({ type: 'text', text: otp });

            result = await sendSystemMessage(phone, 'template', {
                templateName: otpConfig.templateName,
                languageCode: otpConfig.templateLanguage || 'en',
                components: [
                    {
                        type: 'body',
                        parameters: bodyParams
                    }
                ]
            });
        } else {
            // ── TEXT MODE (fallback — only works within 24h conversation window) ──
            const messageBody = otpConfig.messageTemplate
                .replace('{{otp}}', otp)
                .replace('{{appName}}', appName)
                .replace('{{minutes}}', minutes);

            result = await sendSystemMessage(phone, 'text', { body: messageBody });
        }

        if (!result.success) {
            // Don't expose internal error; give a friendly message
            console.error('[OTP] WhatsApp send failed:', result.error);
            return res.status(503).json({
                error: 'Failed to send verification code. Please ensure your WhatsApp number is correct and try again.'
            });
        }

        return res.json({
            success: true,
            expiresIn: otpConfig.otpExpirySec,
            cooldownSec: otpConfig.resendCooldownSec,
            message: `Verification code sent to ${phone.slice(0, -4).replace(/./g, '•')}${phone.slice(-4)}`
        });
    } catch (err) {
        console.error('[SEND OTP] Error:', err);
        res.status(500).json({ error: 'Server error. Please try again.' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// VERIFY OTP  —  POST /api/auth/verify-otp
// Verifies the code and returns a short-lived phoneVerifiedToken (JWT, 10 min).
// This token must be submitted with the registration request.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/verify-otp', authLimiter, async (req, res) => {
    try {
        const { phone, otp } = req.body;

        if (!phone || !otp) {
            return res.status(400).json({ error: 'Phone number and verification code are required.' });
        }

        const otpConfig = await getOtpConfig();
        if (!otpConfig.enabled) {
            return res.status(400).json({ error: 'WhatsApp OTP verification is not enabled.' });
        }

        const normalized = otpStore.normalizePhone(phone);
        const result = otpStore.verifyOtp(normalized, otp, otpConfig);

        if (!result.valid) {
            return res.status(400).json({ error: result.reason });
        }

        // Issue a short-lived phoneVerifiedToken — proves the phone was verified.
        // Registration endpoint will check this token before creating the account.
        const phoneVerifiedToken = jwt.sign(
            { verifiedPhone: phone, normalized },
            process.env.JWT_SECRET,
            { expiresIn: '10m', algorithm: 'HS256' }
        );

        return res.json({
            success: true,
            phoneVerifiedToken,
            message: 'Phone number verified successfully.'
        });
    } catch (err) {
        console.error('[VERIFY OTP] Error:', err);
        res.status(500).json({ error: 'Server error. Please try again.' });
    }
});

// REGISTER
router.post('/register', authLimiter, verifyTurnstile, async (req, res) => {
    try {
        const { name, email, password, selectedPlan, startTrial, ref, partnerCode, phone } = req.body;

        // Fetch Global Security Settings from the primary admin
        const adminUser = await User.findOne({ where: { isAdmin: true } });
        let securityConfig = null;
        let notificationTemplates = null;
        let appName = 'Bluetick';
        if (adminUser) {
            const adminSettings = await Settings.findOne({ where: { userId: adminUser.id } });
            if (adminSettings) {
                securityConfig = adminSettings.securityConfig;
                notificationTemplates = adminSettings.notificationTemplates;
                if (adminSettings.appName) appName = adminSettings.appName;
            }
        }

        // 1. Enforce Allow Registration Policy
        if (securityConfig && securityConfig.allowRegistration === false) {
            return res.status(403).json({ error: 'User registration is currently disabled by the administrator.' });
        }

        // 1b. Enforce WhatsApp OTP verification (if enabled)
        const otpConfig = await getOtpConfig();
        if (otpConfig.enabled) {
            const { phoneVerifiedToken } = req.body;
            if (!phoneVerifiedToken) {
                return res.status(400).json({ error: 'Phone verification is required. Please verify your WhatsApp number before registering.', requiresOtp: true });
            }
            try {
                const decoded = jwt.verify(phoneVerifiedToken, process.env.JWT_SECRET, { algorithms: ['HS256'] });
                // Ensure the verified phone matches the phone in the registration request
                const submittedNormalized = otpStore.normalizePhone(phone || '');
                const tokenNormalized = decoded.normalized || otpStore.normalizePhone(decoded.verifiedPhone || '');
                if (submittedNormalized !== tokenNormalized) {
                    return res.status(400).json({ error: 'Phone number mismatch. Please verify the same number you are registering with.' });
                }
            } catch (jwtErr) {
                return res.status(400).json({ error: 'Phone verification has expired or is invalid. Please verify your WhatsApp number again.', requiresOtp: true });
            }
        }

        // 2. Enforce Mandatory Phone
        if (!phone) {
            return res.status(400).json({ error: 'WhatsApp Phone number is required for registration.' });
        }

        // 3. Enforce Minimum Password Length
        const minLen = securityConfig?.minPasswordLength || 6;
        if (password.length < minLen) {
            return res.status(400).json({ error: `Password must be at least ${minLen} characters long.` });
        }

        // Check if user exists
        let user = await User.findOne({ where: { email } });
        if (user) {
            return res.status(400).json({ error: 'An account with this email address already exists.' });
        }

        let phoneUser = await User.findOne({ where: { phone } });
        if (phoneUser) {
            return res.status(400).json({ error: 'An account with this phone number already exists.' });
        }

        // Lookup Referrer (user-to-user referral)
        let referredBy = null;
        let isReferredByTechPartner = false;
        if (ref) {
            const referrer = await User.findOne({ where: { referralCode: ref } });
            if (referrer) {
                referredBy = referrer.id;
                if (referrer.techPartnerStatus === 'approved') {
                    isReferredByTechPartner = true;
                }
            }
        }

        // Lookup B2B Tech Partner (if user came via ?partner=CODE)
        let techPartnerId = null;
        if (partnerCode) {
            const TechPartner = require('../models/TechPartner');
            const partner = await TechPartner.findOne({ where: { code: partnerCode.toUpperCase(), enabled: true } });
            if (partner) {
                techPartnerId = partner.id;
                isReferredByTechPartner = true;
                // Increment signup counter on the partner
                partner.totalSignups = (partner.totalSignups || 0) + 1;
                await partner.save();
            }
        }

        // Generate unique referral code
        // We'll use a clean 8-char random string or just truncate a UUID
        const crypto = require('crypto');
        const randomStr = crypto.randomBytes(4).toString('hex').toUpperCase(); // e.g. "A1B2C3D4"
        const ownReferralCode = `${name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toUpperCase()}${randomStr}`;

        // Hash Password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Get default plan
        const Plan = require('../models/Plan');
        const defaultPlan = await Plan.findOne({ where: { isDefault: true } });

        let assignedPlan = defaultPlan ? defaultPlan.name : 'Free';
        let planExpiry = null;
        let planStatus = 'Active';

        // Auto-Trial for direct signups:
        if (!selectedPlan && defaultPlan) {
            if (defaultPlan.price > 0) {
                let trialDaysToGive = defaultPlan.trialDays || 0;
                if (isReferredByTechPartner) {
                    trialDaysToGive = 30; // 1-Month Extended License for Tech Partner referrals
                }

                if (trialDaysToGive > 0) {
                    // Auto-activate trial for default paid plan
                    assignedPlan = defaultPlan.name;
                    planStatus = 'Trial';
                    planExpiry = new Date();
                    planExpiry.setDate(planExpiry.getDate() + trialDaysToGive);
                } else {
                    // No trial available, push to pending checkout
                    assignedPlan = 'Free'; 
                    planStatus = 'Pending';
                    planExpiry = new Date();
                }
            } else {
                assignedPlan = defaultPlan.name;
                planStatus = 'Active';
                planExpiry = null;
            }
        }

        // Plan assignment: if user requested a trial and plan supports it, activate trial immediately.
        // Otherwise keep them on Free until checkout succeeds (Option 1 policy).
        let requestedPlanObj = null;
        if (selectedPlan) {
            requestedPlanObj = await Plan.findByPk(selectedPlan);
            if (requestedPlanObj && startTrial) {
                let trialDaysToGive = requestedPlanObj.trialDays || 0;
                if (isReferredByTechPartner) {
                    trialDaysToGive = 30; // 1-Month Extended License for Tech Partner referrals
                }

                if (trialDaysToGive > 0) {
                    // ✅ Auto-activate trial
                    assignedPlan = requestedPlanObj.name;
                    planStatus = 'Trial';
                    planExpiry = new Date();
                    planExpiry.setDate(planExpiry.getDate() + trialDaysToGive);
                } else {
                    // Keep on Free until payment completes
                    assignedPlan = defaultPlan ? defaultPlan.name : 'Free';
                }
            } else {
                // Keep on Free until payment completes
                assignedPlan = defaultPlan ? defaultPlan.name : 'Free';
            }
        }

        // Check if this is the very first user in the system
        const userCount = await User.count();
        const isFirstUser = userCount === 0;

        // Create User with assigned plan
        user = await User.create({
            name, email, password: hashedPassword,
            plan: assignedPlan,
            planExpiry: planExpiry,
            planStatus: planStatus,
            // Mark trial as used if they started one during registration to prevent double-trials
            hasUsedTrial: planStatus === 'Trial',
            referralCode: ownReferralCode,
            referredBy,
            company: req.body.company || null,
            phone: phone, // Save the phone number
            jobTitle: req.body.jobTitle || null,
            techPartnerId: techPartnerId,
            isAdmin: isFirstUser, // Automatically make first user the superadmin
            lastLogin: new Date()
        });

        // ==========================================
        // OFFICIAL APP CRM AUTO-SYNC HOOK
        // ==========================================
        try {
            const SystemConfig = require('../models/SystemConfig');
            const sysConfig = await SystemConfig.getCachedConfig();
            const linkedAdminId = sysConfig?.settings?.linkedAdminUserId;

            if (linkedAdminId && user.id !== linkedAdminId) {
                const Contact = require('../models/Contact');
                // Ensure duplicate contacts aren't created for same phone under the linked account
                const existingContact = await Contact.findOne({ where: { userId: linkedAdminId, phone: user.phone } });
                if (!existingContact) {
                    await Contact.create({
                        userId: linkedAdminId,
                        name: user.name,
                        phone: user.phone,
                        email: user.email,
                        tags: ['App User', planStatus === 'Trial' ? `Plan: ${user.plan} (Trial)` : `Plan: ${user.plan}`]
                    });
                }
            }
        } catch (syncErr) {
            console.error("Auto-sync to linked CRM failed:", syncErr);
            // Non-blocking, continue registration
        }
        // ==========================================

        // ==========================================
        // WELCOME WHATSAPP NOTIFICATION
        // ==========================================
        try {
            const welcomeConfig = notificationTemplates?.whatsapp?.newUser;
            if (welcomeConfig?.enabled && user.phone && welcomeConfig.templateName) {
                const cleanPhone = user.phone.replace(/\D/g, '');
                if (cleanPhone) {
                    const contextMap = {
                        '{name}': user.name || 'User',
                        '{email}': user.email || 'No Email',
                        '{app_name}': appName
                    };

                    let parameters = [];
                    if (welcomeConfig.selectedVariables && welcomeConfig.selectedVariables.length > 0) {
                        parameters = welcomeConfig.selectedVariables.map(v => ({
                            type: 'text',
                            text: contextMap[v] || 'N/A'
                        }));
                    } else {
                        // Fallback legacy
                        parameters = [
                            { type: 'text', text: user.name || 'User' },
                            { type: 'text', text: user.email || 'No Email' },
                            { type: 'text', text: appName }
                        ];
                    }

                    const components = [
                        {
                            type: 'body',
                            parameters: parameters
                        }
                    ];
                    const result = await sendSystemMessage(cleanPhone, 'template', {
                        templateName: welcomeConfig.templateName,
                        languageCode: welcomeConfig.languageCode || 'en',
                        components
                    });
                    if (result.success) {
                        console.log(`[REGISTER] Welcome WhatsApp sent to ${cleanPhone} for user ${user.email}`);
                    } else {
                        console.warn(`[REGISTER] Welcome WhatsApp failed for ${user.email}:`, result.error);
                    }
                }
            }
        } catch (waMsgErr) {
            console.error('[REGISTER] Welcome WhatsApp notification failed:', waMsgErr.message);
        }
        // ==========================================

        // Log Activity
        await logActivity(req, 'User Registered', `New user registration: ${email} - Plan: ${assignedPlan}`);

        // Prepare Notification Message
        let notifyMessage = `New User: ${name} (${email}) registered.`;
        if (referredBy) {
            const referrer = await User.findByPk(referredBy);
            if (referrer) notifyMessage = `New User: ${name} joined via Referral (${referrer.name}).`;
        } else if (techPartnerId) {
            const TechPartner = require('../models/TechPartner');
            const partner = await TechPartner.findByPk(techPartnerId);
            if (partner) notifyMessage = `New User: ${name} joined via Partner (${partner.name}).`;
        }

        // Notify Admin
        await AdminNotification.create({
            type: 'USER_REGISTER',
            message: notifyMessage,
            data: { userId: user.id, email: user.email, plan: assignedPlan }
        });

        // Set HttpOnly cookie and return user data (no token in response body)
        const token = generateToken(user);
        setAuthCookies(res, token);
        // Fetch the actual assigned plan details to return to frontend
        let returnedPlanDetails = await Plan.findOne({ where: { name: assignedPlan } });
        if (user.planStatus === 'Pending') {
            if (!selectedPlan && defaultPlan) {
                returnedPlanDetails = defaultPlan;
            } else if (selectedPlan) {
                returnedPlanDetails = await Plan.findByPk(selectedPlan);
            }
        }
        
        res.json({
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone || '',
                company: user.company || '',
                plan: user.plan,
                planStatus: user.planStatus,
                planExpiry: user.planExpiry,
                planDetails: returnedPlanDetails || null,
                isAdmin: user.isAdmin,
                createdAt: user.createdAt,
                lastLogin: user.lastLogin,
                parentUserId: user.parentUserId,
                teamPolicy: user.teamPolicy,
                selectedPlan: selectedPlan || null
            }
        });

    } catch (err) {
        console.error('[REGISTER] Error:', err);
        res.status(500).json({ error: 'Registration failed. Please try again.' });
    }
});

// LOGIN
router.post('/login', authLimiter, verifyTurnstile, async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check user
        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(400).json({ error: 'Invalid Credentials' });
        }

        // Block access for deleted or suspended accounts
        if (user.status === 'deleted') {
            return res.status(401).json({ error: 'This account no longer exists.' });
        }
        if (user.status === 'suspended') {
            return res.status(403).json({ error: 'Your account has been suspended. Please contact support.' });
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Invalid Credentials' });
        }

        // Update lastLogin
        user.lastLogin = new Date();
        await user.save();

        // Log Activity
        // Manually attach user to req for logger since this is a public route
        req.user = user;
        await logActivity(req, 'User Login', `User logged in successfully`);

        // Fetch Plan Details
        const Plan = require('../models/Plan');
        const planDetails = await Plan.findOne({ where: { name: user.plan } });

        // Set HttpOnly cookie and return user data (no token in response body)
        const token = generateToken(user);
        setAuthCookies(res, token);
        res.json({
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone || '',
                company: user.company || '',
                plan: user.plan,
                planStatus: user.planStatus,
                planDetails: planDetails || null,
                isAdmin: user.isAdmin,
                createdAt: user.createdAt,
                lastLogin: user.lastLogin,
                parentUserId: user.parentUserId,
                teamPolicy: user.teamPolicy
            }
        });

    } catch (err) {
        console.error('[LOGIN] Error:', err);
        res.status(500).json({ error: 'Login failed. Please try again.' });
    }
});

// LOGOUT — Clear HttpOnly auth cookies
router.post('/logout', (req, res) => {
    clearAuthCookies(res);
    res.json({ success: true, message: 'Logged out successfully' });
});

// GET ME (Current User)
router.get('/me', require('../middleware/auth'), async (req, res) => {
    try {
        const user = await User.findByPk(req.user.realId || req.user.id, {
            attributes: { exclude: ['password', 'fbAccessToken', 'metaAdsToken', 'inviteToken'] }
        });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const Plan = require('../models/Plan');
        const planDetails = await Plan.findOne({ where: { name: user.plan } });

        const userData = user.toJSON();
        userData.planDetails = planDetails || null;

        // Preserve impersonation flag if present
        if (req.user.origRole === 'Admin') {
            userData.origRole = 'Admin';
        }

        res.json(userData);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// UPDATE PROFILE (Current User)
router.put('/profile', require('../middleware/auth'), async (req, res) => {
    try {
        const { name, phone, company } = req.body;

        const user = await User.findByPk(req.user.realId || req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Update allowed fields
        if (name) user.name = name;
        if (phone !== undefined) user.phone = phone; // Allow empty string
        if (company !== undefined) user.company = company; // Allow empty string

        await user.save();

        // Log Activity
        await logActivity(req, 'Profile Updated', `User updated their profile: ${user.email}`);

        // Return updated user without password
        const updatedUser = await User.findByPk(req.user.realId || req.user.id, {
            attributes: { exclude: ['password', 'fbAccessToken', 'metaAdsToken', 'inviteToken'] }
        });

        const userData = updatedUser.toJSON();
        
        // Preserve impersonation flag if present
        if (req.user.origRole === 'Admin') {
            userData.origRole = 'Admin';
        }

        res.json(userData);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// UPDATE PASSWORD (Current User)
router.put('/password', require('../middleware/auth'), async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        const user = await User.findByPk(req.user.realId || req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Enforce Minimum Password Length
        const adminUser = await User.findOne({ where: { isAdmin: true } });
        let minLen = 6;
        if (adminUser) {
            const adminSettings = await Settings.findOne({ where: { userId: adminUser.id } });
            if (adminSettings?.securityConfig?.minPasswordLength) {
                minLen = adminSettings.securityConfig.minPasswordLength;
            }
        }

        if (newPassword.length < minLen) {
            return res.status(400).json({ error: `New password must be at least ${minLen} characters long.` });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Incorrect current password' });
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();

        // Log Activity
        await logActivity(req, 'Password Changed', `User changed their password: ${user.email}`);

        res.json({ message: 'Password updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE MY ACCOUNT — Soft Delete
// Preserves ALL admin reporting data (Transaction, AiTokenLog, MessageLog, ActivityLog)
// while removing operational content and blocking login.
router.delete('/me', require('../middleware/auth'), async (req, res) => {
    try {
        const userId = req.user.realId || req.user.id;
        const crypto = require('crypto');
        const { sequelize: seq } = require('../config/database');
        const { Op } = require('sequelize');

        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Super admins cannot self-delete via this route
        if (user.isAdmin) {
            return res.status(403).json({ error: 'Super admins cannot delete their account from here. Please contact the database administrator.' });
        }

        // ── Step 1: Delete child records that have no direct userId FK ──────────
        // These link through a parent table (Contact, Conversation, WaStore).
        // Must be deleted BEFORE the parent to avoid FK constraint errors.
        try {
            // WaStore children
            await seq.query(`DELETE FROM "WaProducts" WHERE "storeId" IN (SELECT id FROM "WaStores" WHERE "userId" = :userId)`, { replacements: { userId } });
            await seq.query(`DELETE FROM "WaOrders" WHERE "storeId" IN (SELECT id FROM "WaStores" WHERE "userId" = :userId)`, { replacements: { userId } });
            await seq.query(`DELETE FROM "WaStoreCoupons" WHERE "storeId" IN (SELECT id FROM "WaStores" WHERE "userId" = :userId)`, { replacements: { userId } });
            // Conversation children
            await seq.query(`DELETE FROM "ChatMessages" WHERE "conversationId" IN (SELECT id FROM "Conversations" WHERE "userId" = :userId)`, { replacements: { userId } });
            // Contact children
            await seq.query(`DELETE FROM "ContactMessages" WHERE "contactId" IN (SELECT id FROM "Contacts" WHERE "userId" = :userId)`, { replacements: { userId } });
            await seq.query(`DELETE FROM "ContactFlowStates" WHERE "contactId" IN (SELECT id FROM "Contacts" WHERE "userId" = :userId)`, { replacements: { userId } });
        } catch (nestedErr) {
            console.warn('[DELETE ACCOUNT] Nested cleanup warning (non-fatal):', nestedErr.message);
        }

        // ── Step 2: Delete direct-userId operational models ────────────────────
        // ⚠️  INTENTIONALLY EXCLUDED to preserve admin dashboard reports:
        //     Transaction, AiTokenLog, MessageLog, ActivityLog
        const OPERATIONAL_MODELS_WITH_USERID = [
            'WaStore',          // parent already safe after step 1 cleaned children
            'VcardEnquiry', 'Vcard',
            'NfcOrder', 'NfcCard',
            'TechPartnerPayout', // has userId
            'TechPartner',
            'MetaAdCampaign',
            'FlowExecutionLog', 'Flow',
            'FormResponse', 'Form',
            'Message',          // outbox campaign messages (NOT MessageLog which is the aggregate log)
            'Conversation',
            'Contact',
            'ApiUsageLog', 'ApiKey', 'Webhook',
            'Group', 'Label', 'QuickReply', 'AutoTagRule',
            'Campaign', 'Template',
            'MediaFile',
            'PaymentSession',
            'UserAddon',
            'SystemNotification',
        ];

        for (const modelName of OPERATIONAL_MODELS_WITH_USERID) {
            try {
                const Model = require(`../models/${modelName}`);
                if (Model && typeof Model.destroy === 'function') {
                    await Model.destroy({ where: { userId } });
                }
            } catch (e) {
                // Model file may not exist or field name may differ — skip silently
            }
        }

        // ── Step 2b: Models with non-standard FK field names ───────────────────
        try {
            const ReferralReward = require('../models/ReferralReward');
            await ReferralReward.destroy({ where: { [Op.or]: [{ referrerId: userId }, { referredUserId: userId }] } });
        } catch (e) { /* ignore */ }

        try {
            const TechPartnerEarning = require('../models/TechPartnerEarning');
            await TechPartnerEarning.destroy({ where: { [Op.or]: [{ referrerId: userId }, { referredUserId: userId }] } });
        } catch (e) { /* ignore */ }

        // Delete Settings
        try {
            await Settings.destroy({ where: { userId } });
        } catch (e) { /* ignore */ }

        // ── Step 3: Soft-delete the User row ──────────────────────────────────
        // We KEEP name and email on the row — admin dashboard JOINs for
        // Top Token Consumers, Activity Logs, and historical purchase records
        // all rely on this to display the real identity in reports.
        // We CLEAR only auth/security-sensitive fields.
        user.status = 'deleted';
        user.deletedAt = new Date();
        user.password = '$DELETED$' + crypto.randomBytes(32).toString('hex');
        user.fbAccessToken = null;
        user.metaAdsToken = null;
        user.inviteToken = null;
        user.referralCode = null;
        await user.save();

        // Invalidate session cookies
        clearAuthCookies(res);

        await logActivity(req, 'Account Deleted', `User ${user.email} deleted their own account`);

        res.json({ message: 'Account permanently deleted.' });
    } catch (err) {
        console.error('[DELETE ACCOUNT] Error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
