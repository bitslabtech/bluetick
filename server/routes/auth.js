const express = require('express');
const router = express.Router();
const { authLimiter } = require('../middleware/rateLimiter');
const verifyTurnstile = require('../middleware/turnstile');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Settings = require('../models/Settings');
const AdminNotification = require('../models/AdminNotification');

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

        // Fix: If direct signup AND the default plan has a trial period, enforce the trial.
        if (!selectedPlan && defaultPlan) {
            let trialDaysToGive = defaultPlan.trialDays || 0;
            if (isReferredByTechPartner) {
                trialDaysToGive = 30; // 1-Month Extended License for Tech Partner referrals
            }

            if (trialDaysToGive > 0) {
                planStatus = 'Trial';
                planExpiry = new Date();
                planExpiry.setDate(planExpiry.getDate() + trialDaysToGive);
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
                        tags: ['App User', `Plan: ${user.plan}`]
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
                    const components = [
                        {
                            type: 'body',
                            parameters: [
                                { type: 'text', text: user.name || 'User' },
                                { type: 'text', text: user.email || 'No Email' },
                                { type: 'text', text: appName }
                            ]
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
        const assignedPlanDetails = await Plan.findOne({ where: { name: assignedPlan } });
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
                planDetails: assignedPlanDetails || null,
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

        res.json(updatedUser);
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

// DELETE MY ACCOUNT
router.delete('/me', require('../middleware/auth'), async (req, res) => {
    try {
        const userId = req.user.realId || req.user.id;

        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Prevent admin from deleting themselves via this route
        if (user.isAdmin) {
            return res.status(403).json({ error: 'Super admins cannot delete their account from here. Please contact the database administrator.' });
        }

        // Delete associated data (cascade should handle FK relationships, but be explicit)
        const { Op } = require('sequelize');
        const contactModels = ['Contact', 'MessageLog', 'Campaign', 'Template', 'ActivityLog', 'SystemNotification'];
        for (const modelName of contactModels) {
            try {
                const Model = require(`../models/${modelName}`);
                if (Model && typeof Model.destroy === 'function') {
                    await Model.destroy({ where: { userId } });
                }
            } catch (e) {
                // Model might not exist or have userId - skip silently
            }
        }

        // Delete Settings
        try {
            await Settings.destroy({ where: { userId } });
        } catch (e) { /* ignore */ }

        // Finally delete the user
        await user.destroy();

        res.json({ message: 'Account permanently deleted.' });
    } catch (err) {
        console.error('[DELETE ACCOUNT] Error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
