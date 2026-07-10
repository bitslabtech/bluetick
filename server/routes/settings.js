const express = require('express');
const axios = require('axios');
const router = express.Router();
const Settings = require('../models/Settings');
const auth = require('../middleware/auth');
const logActivity = require('../utils/logger');
const User = require('../models/User');
const multer = require('multer');
const { generalImageFilter } = require('../utils/storageProvider');
const upload = multer({ 
    dest: 'uploads/', 
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: generalImageFilter
});
const fs = require('fs');

// ── Security: Mask sensitive values before sending to client ──
const MASK = '••••••••';
const isMasked = (val) => typeof val === 'string' && val.startsWith('••••••••');

const maskSecret = (value) => {
    if (!value || typeof value !== 'string') return value;
    if (value.length <= 4) return MASK;
    return MASK + value.slice(-4);
};

const maskSettingsForClient = (settings) => {
    const json = settings.toJSON ? settings.toJSON() : { ...settings };

    // Mask Meta access token
    if (json.metaAccessToken) json.metaAccessToken = maskSecret(json.metaAccessToken);

    // Mask payment gateway secrets
    if (json.paymentGateways) {
        const pg = json.paymentGateways;
        if (pg.razorpay?.keySecret) pg.razorpay.keySecret = maskSecret(pg.razorpay.keySecret);
        if (pg.stripe?.secretKey) pg.stripe.secretKey = maskSecret(pg.stripe.secretKey);
        if (pg.phonepe?.saltKey) pg.phonepe.saltKey = maskSecret(pg.phonepe.saltKey);
        if (pg.cashfree?.secretKey) pg.cashfree.secretKey = maskSecret(pg.cashfree.secretKey);
    }

    // Mask SMTP password
    if (json.smtpConfig?.pass) json.smtpConfig.pass = maskSecret(json.smtpConfig.pass);

    return json;
};

// ── In-memory cache for public settings (via centralized manager) ──
const cacheManager = require('../utils/cacheManager');
const _publicSettingsCache = cacheManager.createSimpleCache('public_settings', 60_000);

const invalidatePublicSettingsCache = () => {
    cacheManager.invalidate('public_settings');
};

// PUBLIC ROUTE: Get global branding settings (unauthenticated)
router.get('/public', async (req, res) => {
    try {
        // Return cached result if still fresh
        const cached = _publicSettingsCache.get();
        if (cached) return res.json(cached);

        // Fetch global system config for things like menuOrder
        const SystemConfig = require('../models/SystemConfig');
        const systemConfig = await SystemConfig.getConfig();

        // Find the first admin user
        const adminUser = await User.findOne({ where: { isAdmin: true } });
        if (!adminUser) {
            const result = { 
                appName: 'Bluetick',
                menuOrder: systemConfig.menuOrder,
                settings: {
                    showLockedMenus: systemConfig.settings?.showLockedMenus !== false && systemConfig.settings?.showLockedMenus !== 'false'
                }
            };
            _publicSettingsCache.set(result);
            return res.json(result); // No admin found, return with default name
        }

        // Get their settings
        const settings = await Settings.findOne({ where: { userId: adminUser.id } });
        if (!settings) {
            const result = { 
                appName: 'Bluetick',
                menuOrder: systemConfig.menuOrder,
                settings: {
                    showLockedMenus: systemConfig.settings?.showLockedMenus !== false && systemConfig.settings?.showLockedMenus !== 'false'
                }
            };
            _publicSettingsCache.set(result);
            return res.json(result);
        }

        // Only return non-sensitive branding data
        const result = {
            appName: settings.appName || 'Bluetick',
            appTagline: settings.appTagline || 'Business API',
            logoUrl: settings.logoUrl,
            faviconUrl: settings.faviconUrl,
            registerBannerUrl: settings.registerBannerUrl,
            primaryColor: settings.primaryColor,
            secondaryColor: settings.secondaryColor,
            theme: settings.theme,
            currency: settings.currency,
            menuOrder: systemConfig.menuOrder,
            // OTP verification toggle — read by Register.jsx to show/hide OTP step
            whatsappOtpEnabled: settings.securityConfig?.whatsappOtp?.enabled === true,
            settings: {
                showLockedMenus: systemConfig.settings?.showLockedMenus !== false && systemConfig.settings?.showLockedMenus !== 'false'
            }
        };
        _publicSettingsCache.set(result);
        res.json(result);
    } catch (err) {
        console.error("Public Settings Error:", err);
        res.status(500).json({ error: 'Failed to fetch public settings' });
    }
});

// Protect all other routes
router.use(auth);

// GET /webhook-token — Return the webhook verify token for the UI to display
router.get('/webhook-token', (req, res) => {
    res.json({ verifyToken: process.env.WEBHOOK_VERIFY_TOKEN || '' });
});

router.get('/', async (req, res) => {
    try {
        let settings = await Settings.findOne({ where: { userId: req.user.id } });
        if (!settings) {
            settings = await Settings.create({ userId: req.user.id });
        }

        // ── Auto-heal: If Settings is missing WhatsApp creds but User has them ──
        // This handles the case where exchange-token saved to User model successfully
        // but the Settings table was blanked out (e.g. by old wipeManual code or a bug).
        const user = await User.findByPk(req.user.id);
        let settingsModified = false;

        if (user) {
            // Sync metaPhoneNumberId: User.metaPhoneNumberId → Settings.metaPhoneNumberId
            if (user.metaPhoneNumberId && !settings.metaPhoneNumberId) {
                settings.metaPhoneNumberId = user.metaPhoneNumberId;
                settingsModified = true;
                console.log('[Settings GET] Auto-healed metaPhoneNumberId from User model:', user.metaPhoneNumberId);
            }

            // Sync metaBusinessAccountId: User.wabaId → Settings.metaBusinessAccountId
            if (user.wabaId && !settings.metaBusinessAccountId) {
                settings.metaBusinessAccountId = user.wabaId;
                settingsModified = true;
                console.log('[Settings GET] Auto-healed metaBusinessAccountId from User model:', user.wabaId);
            }

            // Sync metaAccessToken: User.fbAccessToken → Settings.metaAccessToken
            if (user.fbAccessToken && !settings.metaAccessToken) {
                settings.metaAccessToken = user.fbAccessToken;
                settingsModified = true;
                console.log('[Settings GET] Auto-healed metaAccessToken from User model (length:', user.fbAccessToken.length, ')');
            }

            if (settingsModified) {
                try {
                    await settings.save();
                    console.log('[Settings GET] ✅ Settings table auto-healed from User model for user:', req.user.id);
                } catch (saveErr) {
                    console.error('[Settings GET] ⚠️ Auto-heal save failed (likely token length issue):', saveErr.message);
                    // Continue anyway so the client still gets the in-memory settings
                }
            }
        }
        
        let jsonRes = maskSettingsForClient(settings);
        
        // Admins can read system-level storage config
        if (req.user.isAdmin) {
            const SystemConfig = require('../models/SystemConfig');
            const sysConfig = await SystemConfig.getConfig();
            jsonRes.storage = sysConfig.settings?.storage || { type: 'local', s3: {}, r2: {} };
            
            // Mask S3 credentials
            if (jsonRes.storage.s3?.accessKeyId) {
                jsonRes.storage.s3.accessKeyId = maskSecret(jsonRes.storage.s3.accessKeyId);
            }
            if (jsonRes.storage.s3?.secretAccessKey) {
                jsonRes.storage.s3.secretAccessKey = maskSecret(jsonRes.storage.s3.secretAccessKey);
            }
            // Mask R2 credentials (accountId, accessKeyId, secretAccessKey)
            if (jsonRes.storage.r2?.accountId) {
                jsonRes.storage.r2.accountId = maskSecret(jsonRes.storage.r2.accountId);
            }
            if (jsonRes.storage.r2?.accessKeyId) {
                jsonRes.storage.r2.accessKeyId = maskSecret(jsonRes.storage.r2.accessKeyId);
            }
            if (jsonRes.storage.r2?.secretAccessKey) {
                jsonRes.storage.r2.secretAccessKey = maskSecret(jsonRes.storage.r2.secretAccessKey);
            }
        }
        
        // Return masked version — secrets are never sent to the browser
        res.json(jsonRes);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const {
            metaPhoneNumberId, metaAccessToken, metaBusinessAccountId,
            appName, supportEmail, currency, timezone,
            primaryColor, secondaryColor, logoUrl,
            theme, language, dateFormat,
            notificationTemplates,
            paymentGateways,
            smtpConfig,
            securityConfig,
            whatsappProfile,
            whatsappAutomations,
            teamPolicy,
            storage
        } = req.body;

        let settings = await Settings.findOne({ where: { userId: req.user.id } });

        if (!settings) {
            settings = await Settings.create({
                metaPhoneNumberId: metaPhoneNumberId ? String(metaPhoneNumberId).replace(/\s/g, '') : undefined,
                metaAccessToken: metaAccessToken ? String(metaAccessToken).replace(/\s/g, '') : undefined,
                metaBusinessAccountId: metaBusinessAccountId ? String(metaBusinessAccountId).replace(/\s/g, '') : undefined,
                appName, supportEmail, currency, timezone,
                primaryColor, secondaryColor, logoUrl,
                theme, language, dateFormat,
                notificationTemplates,
                paymentGateways,
                smtpConfig,
                securityConfig,
                whatsappProfile: whatsappProfile || { description: '', about: '', address: '', email: '', websites: [], vertical: '' },
                whatsappAutomations: whatsappAutomations || { welcomeMessage: { enabled: false, text: '' }, offHoursMessage: { enabled: false, text: '', timezone: 'UTC', schedule: [] } },
                userId: req.user.id
            });
        } else {
            // Update fields — ignore masked values sent back from frontend
            settings.metaPhoneNumberId = metaPhoneNumberId !== undefined ? String(metaPhoneNumberId).replace(/\s/g, '') : settings.metaPhoneNumberId;
            settings.metaAccessToken = (metaAccessToken !== undefined && !isMasked(metaAccessToken)) ? String(metaAccessToken).replace(/\s/g, '') : settings.metaAccessToken;
            settings.metaBusinessAccountId = metaBusinessAccountId !== undefined ? String(metaBusinessAccountId).replace(/\s/g, '') : settings.metaBusinessAccountId;

            settings.appName = appName || settings.appName;
            settings.supportEmail = supportEmail || settings.supportEmail;
            settings.currency = currency || settings.currency;
            settings.timezone = timezone || settings.timezone;
            settings.primaryColor = primaryColor || settings.primaryColor;
            settings.secondaryColor = secondaryColor || settings.secondaryColor;
            settings.logoUrl = logoUrl || settings.logoUrl;
            if (req.body.faviconUrl !== undefined) settings.faviconUrl = req.body.faviconUrl;
            settings.theme = theme || settings.theme;
            settings.language = language || settings.language;
            settings.dateFormat = dateFormat || settings.dateFormat;

            if (teamPolicy !== undefined) {
                settings.teamPolicy = {
                    ...settings.teamPolicy,
                    ...teamPolicy
                };
                settings.changed('teamPolicy', true);
            }

            if (notificationTemplates) {
                settings.notificationTemplates = notificationTemplates;
            }
            if (paymentGateways) {
                // Preserve existing secrets if client sent back masked values
                const existingPG = settings.paymentGateways || {};
                const safePG = { ...paymentGateways };
                if (safePG.razorpay?.keySecret && isMasked(safePG.razorpay.keySecret)) safePG.razorpay.keySecret = existingPG.razorpay?.keySecret || '';
                if (safePG.stripe?.secretKey && isMasked(safePG.stripe.secretKey)) safePG.stripe.secretKey = existingPG.stripe?.secretKey || '';
                if (safePG.phonepe?.saltKey && isMasked(safePG.phonepe.saltKey)) safePG.phonepe.saltKey = existingPG.phonepe?.saltKey || '';
                if (safePG.cashfree?.secretKey && isMasked(safePG.cashfree.secretKey)) safePG.cashfree.secretKey = existingPG.cashfree?.secretKey || '';
                settings.paymentGateways = safePG;
            }
            if (smtpConfig) {
                // Preserve existing SMTP password if masked
                const existingSMTP = settings.smtpConfig || {};
                const safeSMTP = { ...smtpConfig };
                if (safeSMTP.pass && isMasked(safeSMTP.pass)) safeSMTP.pass = existingSMTP.pass || '';
                settings.smtpConfig = safeSMTP;
            }
            if (securityConfig) {
                settings.securityConfig = securityConfig;
            }

            if (whatsappAutomations !== undefined) {
                settings.whatsappAutomations = whatsappAutomations;
            }

            if (whatsappProfile !== undefined) {
                settings.whatsappProfile = whatsappProfile;

                // Fire async request to Meta graph API to update their live profile
                if (settings.metaPhoneNumberId && settings.metaAccessToken) {
                    try {
                        let websites = whatsappProfile.websites || [];
                        if (typeof websites === 'string') websites = [websites];
                        // Meta allows maximum of 2 websites
                        websites = websites.slice(0, 2);

                        const profilePayload = {
                            messaging_product: "whatsapp",
                            address: whatsappProfile.address || "",
                            description: whatsappProfile.description || "",
                            about: whatsappProfile.about || "",
                            vertical: whatsappProfile.vertical || "OTHER",
                            email: whatsappProfile.email || "",
                            websites: websites
                        };

                        const profileRes = await fetch(
                            `https://graph.facebook.com/v21.0/${settings.metaPhoneNumberId}/whatsapp_business_profile`,
                            {
                                method: 'POST',
                                headers: {
                                    'Authorization': `Bearer ${settings.metaAccessToken}`,
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify(profilePayload)
                            }
                        );
                        const profileData = await profileRes.json();
                        if (profileData.success) {
                            console.log(`[SETTINGS] WhatsApp Business Profile updated for phone ${settings.metaPhoneNumberId}`);
                        } else {
                            console.warn(`[SETTINGS] WhatsApp Business Profile update failed:`, profileData);
                        }
                    } catch (e) {
                        console.warn('[SETTINGS] Could not sync WhatsApp profile to Meta:', e.message);
                    }
                }
            }

            await settings.save();
        }

        // Invalidate the public settings cache so changes are reflected immediately
        invalidatePublicSettingsCache();

        // Log Activity
        await logActivity(req, 'Settings Updated', 'Updated application settings');

        // Auto-subscribe to WABA webhooks whenever Meta credentials are saved
        if (settings.metaBusinessAccountId && settings.metaAccessToken) {
            try {
                const subRes = await fetch(
                    `https://graph.facebook.com/v21.0/${settings.metaBusinessAccountId}/subscribed_apps`,
                    {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${settings.metaAccessToken}` }
                    }
                );
                const subData = await subRes.json();
                if (subData.success) {
                    console.log(`[SETTINGS] WABA webhook subscription confirmed for WABA: ${settings.metaBusinessAccountId}`);
                } else {
                    console.warn(`[SETTINGS] WABA webhook subscription failed:`, subData);
                }
            } catch (e) {
                console.warn('[SETTINGS] Could not subscribe to WABA webhooks:', e.message);
            }
        }

        // Handle System-level configurations (like storage) if user is admin
        if (req.user.isAdmin && storage !== undefined) {
            const SystemConfig = require('../models/SystemConfig');
            const sysConfig = await SystemConfig.getConfig();
            
            // ── S3 credential preservation ──
            let currentS3 = sysConfig.settings?.storage?.s3 || {};
            let safeS3 = storage.s3 ? { ...storage.s3 } : {};
            
            // Preserve existing S3 credentials if masked
            if (safeS3.accessKeyId && isMasked(safeS3.accessKeyId)) {
                safeS3.accessKeyId = currentS3.accessKeyId || '';
            }
            if (safeS3.secretAccessKey && isMasked(safeS3.secretAccessKey)) {
                safeS3.secretAccessKey = currentS3.secretAccessKey || '';
            }

            // ── R2 credential preservation ──
            let currentR2 = sysConfig.settings?.storage?.r2 || {};
            let safeR2 = storage.r2 ? { ...storage.r2 } : {};

            if (safeR2.accountId && isMasked(safeR2.accountId)) {
                safeR2.accountId = currentR2.accountId || '';
            }
            if (safeR2.accessKeyId && isMasked(safeR2.accessKeyId)) {
                safeR2.accessKeyId = currentR2.accessKeyId || '';
            }
            if (safeR2.secretAccessKey && isMasked(safeR2.secretAccessKey)) {
                safeR2.secretAccessKey = currentR2.secretAccessKey || '';
            }
            
            let safeStorage = {
                type: storage.type || 'local',
                s3: safeS3,
                r2: safeR2
            };

            sysConfig.settings = {
                ...sysConfig.settings,
                storage: safeStorage
            };
            sysConfig.changed('settings', true);
            await sysConfig.save();
        }

        // Return masked version after save
        let jsonRes = maskSettingsForClient(settings);
        if (req.user.isAdmin) {
            const SystemConfig = require('../models/SystemConfig');
            const sysConfig = await SystemConfig.getConfig();
            jsonRes.storage = sysConfig.settings?.storage || { type: 'local', s3: {}, r2: {} };
            // Mask S3 credentials
            if (jsonRes.storage.s3?.accessKeyId) {
                jsonRes.storage.s3.accessKeyId = maskSecret(jsonRes.storage.s3.accessKeyId);
            }
            if (jsonRes.storage.s3?.secretAccessKey) {
                jsonRes.storage.s3.secretAccessKey = maskSecret(jsonRes.storage.s3.secretAccessKey);
            }
            // Mask R2 credentials
            if (jsonRes.storage.r2?.accountId) {
                jsonRes.storage.r2.accountId = maskSecret(jsonRes.storage.r2.accountId);
            }
            if (jsonRes.storage.r2?.accessKeyId) {
                jsonRes.storage.r2.accessKeyId = maskSecret(jsonRes.storage.r2.accessKeyId);
            }
            if (jsonRes.storage.r2?.secretAccessKey) {
                jsonRes.storage.r2.secretAccessKey = maskSecret(jsonRes.storage.r2.secretAccessKey);
            }
        }
        
        res.json(jsonRes);
    } catch (err) {
        console.error('[SETTINGS] Save error:', err.message, err.stack?.split('\n')[1]);
        res.status(400).json({ error: err.message });
    }
});

// PUT /api/settings — Partial update handler (e.g. for CTWA auto-reply config from GrowthHub)
router.put('/', async (req, res) => {
    try {
        let settings = await Settings.findOne({ where: { userId: req.user.id } });
        if (!settings) {
            settings = await Settings.create({ userId: req.user.id });
        }

        // Only update the fields explicitly sent in the PUT body
        const allowedFields = ['ctwaAutoReplyTemplate', 'whatsappAutomations', 'teamPolicy'];
        let changed = false;
        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                settings[field] = req.body[field];
                settings.changed(field, true);
                changed = true;
            }
        }

        if (changed) await settings.save();

        res.json({ success: true, message: 'Settings updated' });
    } catch (err) {
        console.error('[SETTINGS PUT] Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});


// POST /upload-whatsapp-profile-img — Upload WhatsApp business profile photo to Meta
const { compressImage, isCompressibleImage } = require('../utils/imageCompressor');
router.post('/upload-whatsapp-profile-img', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No image provided' });

        const settings = await Settings.findOne({ where: { userId: req.user.id } });
        if (!settings?.metaPhoneNumberId || !settings?.metaAccessToken) {
            return res.status(400).json({ error: 'WhatsApp not configured in settings' });
        }

        const token = settings.metaAccessToken;
        const phoneId = settings.metaPhoneNumberId;

        // Compress image before uploading to Meta
        let fileBuffer = fs.readFileSync(req.file.path);
        let fileSize = fileBuffer.length;
        const fileType = req.file.mimetype;

        if (isCompressibleImage(fileType)) {
            try {
                const result = await compressImage(fileBuffer, fileType);
                if (result.compressed) {
                    fileBuffer = result.buffer;
                    fileSize = result.buffer.length;
                    // Overwrite on disk so cleanup still works
                    fs.writeFileSync(req.file.path, fileBuffer);
                    console.log(`[WABA PROFILE DP] Compressed: ${(result.originalSize / 1024).toFixed(0)}KB → ${(result.compressedSize / 1024).toFixed(0)}KB`);
                }
            } catch (compressErr) {
                console.warn('[WABA PROFILE DP] Compression failed, using original:', compressErr.message);
            }
        }

        // Step 1: Initialize Resumable Upload Session
        console.log(`[WABA PROFILE DP] Init Upload Session for ${phoneId}`);
        const initRes = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/uploads?file_length=${fileSize}&file_type=${fileType}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const initData = await initRes.json();

        if (!initData.id) {
            console.error('[WABA PROFILE DP] Failed to init upload session:', initData);
            return res.status(400).json({ error: 'Failed to init Meta upload session', details: initData });
        }

        const uploadSessionId = initData.id;

        // Step 2: Upload File Bytes
        console.log(`[WABA PROFILE DP] Uploading bytes to session ${uploadSessionId}`);
        const uploadRes = await fetch(`https://graph.facebook.com/v21.0/${uploadSessionId}`, {
            method: 'POST',
            headers: {
                'Authorization': `OAuth ${token}`,
                'file_offset': '0'
            },
            body: fileBuffer
        });
        const uploadData = await uploadRes.json();

        if (!uploadData.h) {
            console.error('[WABA PROFILE DP] Failed to upload bytes:', uploadData);
            return res.status(400).json({ error: 'Failed to upload bytes to Meta', details: uploadData });
        }

        const fileHandle = uploadData.h;

        // Step 3: Set Web Profile Picture
        console.log(`[WABA PROFILE DP] Setting profile picture with handle ${fileHandle}`);
        const setRes = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/whatsapp_business_profile`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messaging_product: 'whatsapp',
                profile_picture_handle: fileHandle
            })
        });

        const setData = await setRes.json();

        if (!setData.success) {
            console.error('[WABA PROFILE DP] Failed to set profile picture:', setData);
            return res.status(400).json({ error: 'Uploaded, but failed to set as profile picture.', details: setData });
        }

        // Cleanup local temp file
        try { fs.unlinkSync(req.file.path); } catch (e) { }

        res.json({ success: true, message: 'Profile picture updated successfully' });

    } catch (err) {
        console.error('[SETTINGS DP] Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET /sync-whatsapp-profile — Fetch WhatsApp business profile from Meta
router.get('/sync-whatsapp-profile', auth, async (req, res) => {
    try {
        const settings = await Settings.findOne({ where: { userId: req.user.id } });
        if (!settings?.metaPhoneNumberId || !settings?.metaAccessToken) {
            return res.status(400).json({ error: 'WhatsApp not configured in settings' });
        }

        const token = settings.metaAccessToken;
        const phoneId = settings.metaPhoneNumberId;

        const response = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/whatsapp_business_profile?fields=about,address,description,email,profile_picture_url,websites,vertical`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();

        if (data.error) {
            return res.status(400).json({ error: data.error.message || 'Failed to fetch Meta profile' });
        }

        const profileData = data.data?.[0];
        if (!profileData) {
            return res.status(404).json({ error: 'No profile found on Meta' });
        }

        // Map Meta fields to our internal whatsappProfile structure
        const updatedProfile = {
            description: profileData.description || '',
            about: profileData.about || '',
            address: profileData.address || '',
            email: profileData.email || '',
            websites: profileData.websites || [''],
            vertical: profileData.vertical || 'OTHER',
            profilePictureUrl: profileData.profile_picture_url || ''
        };

        // Save to DB
        settings.whatsappProfile = updatedProfile;
        settings.changed('whatsappProfile', true);
        await settings.save();

        await logActivity(req, 'Profile Synced', `Synced WhatsApp Business Profile for ${phoneId}`);

        res.json({ success: true, profile: updatedProfile });
    } catch (err) {
        console.error('[SETTINGS SYNC] Error:', err);
        res.status(500).json({ error: err.message });
    }
});


// POST /subscribe-waba — Manually subscribe app to WABA webhook events
// This is the CRITICAL step Meta requires to receive real message delivery/read events.
router.post('/subscribe-waba', async (req, res) => {
    try {
        const settings = await Settings.findOne({ where: { userId: req.user.id } });
        if (!settings?.metaBusinessAccountId || !settings?.metaAccessToken) {
            return res.status(400).json({ error: 'WhatsApp WABA ID and Access Token must be configured in Settings first.' });
        }

        const wabaId = settings.metaBusinessAccountId;
        const token = settings.metaAccessToken;

        console.log(`[SUBSCRIBE-WABA] Subscribing app to WABA: ${wabaId}`);

        const response = await fetch(
            `https://graph.facebook.com/v21.0/${wabaId}/subscribed_apps`,
            {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            }
        );

        const data = await response.json();
        console.log(`[SUBSCRIBE-WABA] Meta response:`, data);

        if (data.success) {
            res.json({ success: true, message: `Successfully subscribed to WABA ${wabaId}. Webhooks are now active!` });
        } else {
            res.status(400).json({
                success: false,
                error: data.error?.message || 'Subscription failed',
                details: data
            });
        }
    } catch (err) {
        console.error('[SUBSCRIBE-WABA] Error:', err);
        res.status(500).json({ error: err.message });
    }
});

router.post('/test', auth, async (req, res) => {
    try {
        let { metaPhoneNumberId, metaAccessToken } = req.body;

        if (!metaPhoneNumberId || !metaAccessToken) {
            return res.status(400).json({ error: 'Phone Number ID and Access Token are required.' });
        }

        // If the frontend sent masked values (••••••••), read real credentials from DB
        if (isMasked(metaAccessToken) || isMasked(metaPhoneNumberId)) {
            const dbSettings = await Settings.findOne({ where: { userId: req.user.id } });
            if (!dbSettings || !dbSettings.metaAccessToken || !dbSettings.metaPhoneNumberId) {
                return res.status(400).json({ error: 'No saved WhatsApp credentials found. Please save your settings first.' });
            }
            metaAccessToken = dbSettings.metaAccessToken;
            metaPhoneNumberId = dbSettings.metaPhoneNumberId;
        }

        // Strip any non-printable / non-ASCII characters to prevent header injection errors
        metaPhoneNumberId = metaPhoneNumberId.replace(/[^\x20-\x7E]/g, '').trim();
        metaAccessToken = metaAccessToken.replace(/[^\x20-\x7E]/g, '').trim();

        // Verify with Meta Graph API
        // If a test phone number is provided, try to send a message
        if (req.body.testPhoneNumber) {
            const sendTestMessage = async (langCode) => {
                return axios.post(`https://graph.facebook.com/v21.0/${metaPhoneNumberId}/messages`, {
                    messaging_product: 'whatsapp',
                    to: req.body.testPhoneNumber,
                    type: 'template',
                    template: {
                        name: 'hello_world',
                        language: { code: langCode }
                    }
                }, {
                    headers: {
                        'Authorization': `Bearer ${metaAccessToken}`,
                        'Content-Type': 'application/json'
                    }
                });
            };

            try {
                let messageResponse;
                try {
                    // Try standard US English first
                    messageResponse = await sendTestMessage('en_US');
                } catch (err) {
                    // Code 132001: Template name does not exist in the translation
                    // Many modern WABAs default to 'en' instead of 'en_US'
                    if (err.response?.data?.error?.code === 132001) {
                        console.log('[WA TEST] en_US failed, falling back to en...');
                        messageResponse = await sendTestMessage('en');
                    } else {
                        throw err;
                    }
                }

                return res.json({
                    success: true,
                    message: 'Connection successful! Test message sent.',
                    data: messageResponse.data
                });
            } catch (err) {
                console.error("Meta API Message Send Failed:", err.response?.data || err.message);
                return res.status(400).json({
                    error: err.response?.data?.error?.message || 'Failed to send test message.',
                    details: err.response?.data?.error
                });
            }
        }

        // Fallback: Just check GET request if no phone number (Verification only)
        try {
            const response = await axios.get(`https://graph.facebook.com/v21.0/${metaPhoneNumberId}`, {
                headers: {
                    'Authorization': `Bearer ${metaAccessToken}`
                }
            });

            return res.json({ success: true, message: 'Credentials verified successfully.', data: response.data });
        } catch (err) {
            const data = err.response?.data || {};
            console.error("Meta API Verification Failed:", data);

            let errorMessage = data.error?.message || 'Connection failed.';

            // Add helpful context based on Meta error codes
            if (data.error?.code === 190) errorMessage += " (Invalid or Expired Access Token)";
            if (err.response?.status === 404) errorMessage += " (Phone Number ID not found. Check if the ID is correct.)";

            return res.status(400).json({
                error: errorMessage,
                details: data.error
            });
        }

    } catch (err) {
        console.error("Test connection error:", err);
        res.status(500).json({ error: 'Internal server error during connection test.' });
    }
});

// Test SMTP Connection
router.post('/test-smtp', async (req, res) => {
    try {
        let { host, port, user, pass, secure, fromEmail } = req.body;

        if (!host || !port || !user || !pass) {
            return res.status(400).json({ error: 'Missing required SMTP credentials.' });
        }

        // If the frontend sent a masked password, read the real one from DB
        if (isMasked(pass)) {
            const dbSettings = await Settings.findOne({ where: { userId: req.user.id } });
            if (!dbSettings || !dbSettings.smtpConfig?.pass) {
                return res.status(400).json({ error: 'No saved SMTP password found. Please save your settings first.' });
            }
            pass = dbSettings.smtpConfig.pass;
        }

        const nodemailer = require('nodemailer');

        const transporter = nodemailer.createTransport({
            host,
            port: Number(port),
            secure: secure, // true for 465, false for other ports
            auth: {
                user,
                pass
            }
        });

        // Verify connection configuration
        await transporter.verify();

        // Send a test email
        await transporter.sendMail({
            from: fromEmail || user,
            to: user, // Send to self
            subject: 'SMTP Connection Test - Bluetick',
            text: 'If you received this email, your SMTP configuration is working correctly!',
            html: '<b>SMTP Connection Successful!</b><br>Your email settings are correctly configured.'
        });

        res.json({ success: true, message: 'Connection verified and test email sent.' });

    } catch (err) {
        console.error("Test SMTP error:", err);
        res.status(500).json({ error: `Connection failed: ${err.message}` });
    }
});

const storageProvider = require('../utils/storageProvider');

router.post('/upload-logo', storageProvider('logos', { fileFilter: storageProvider.generalImageFilter, convertToWebp: true }).single('logo'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const publicUrl = req.file.publicUrl;

        // Also save the logoUrl to the user's settings immediately
        let settings = await Settings.findOne({ where: { userId: req.user.id } });
        if (!settings) {
            settings = await Settings.create({ userId: req.user.id, logoUrl: publicUrl });
        } else {
            settings.logoUrl = publicUrl;
            await settings.save();
        }

        res.json({ success: true, logoUrl: publicUrl });
    } catch (err) {
        console.error('[LOGO UPLOAD] Error:', err);
        res.status(500).json({ error: err.message });
    }
});

router.post('/upload-favicon', storageProvider('favicons', { fileFilter: storageProvider.generalImageFilter, convertToWebp: true }).single('favicon'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const publicUrl = req.file.publicUrl;

        // Also save the faviconUrl to the user's settings immediately
        let settings = await Settings.findOne({ where: { userId: req.user.id } });
        if (!settings) {
            settings = await Settings.create({ userId: req.user.id, faviconUrl: publicUrl });
        } else {
            settings.faviconUrl = publicUrl;
            await settings.save();
        }

        // Invalidate public settings cache so favicon updates immediately
        invalidatePublicSettingsCache();

        res.json({ success: true, faviconUrl: publicUrl });
    } catch (err) {
        console.error('[FAVICON UPLOAD] Error:', err);
        res.status(500).json({ error: err.message });
    }
});

router.post('/upload-register-banner', storageProvider('banners', { fileFilter: storageProvider.generalImageFilter, convertToWebp: true }).single('banner'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const publicUrl = req.file.publicUrl;

        // Save the banner to the user's settings
        let settings = await Settings.findOne({ where: { userId: req.user.id } });
        if (!settings) {
            settings = await Settings.create({ userId: req.user.id, registerBannerUrl: publicUrl });
        } else {
            settings.registerBannerUrl = publicUrl;
            await settings.save();
        }

        // Invalidate public settings cache
        invalidatePublicSettingsCache();

        res.json({ success: true, registerBannerUrl: publicUrl });
    } catch (err) {
        console.error('[BANNER UPLOAD] Error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
