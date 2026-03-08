const express = require('express');
const router = express.Router();
const Settings = require('../models/Settings');
const auth = require('../middleware/auth');
const logActivity = require('../utils/logger');
const User = require('../models/User');

// PUBLIC ROUTE: Get global branding settings (unauthenticated)
router.get('/public', async (req, res) => {
    try {
        // Find the first admin user
        const adminUser = await User.findOne({ where: { isAdmin: true } });
        if (!adminUser) {
            return res.json({}); // No admin found, return empty
        }

        // Get their settings
        const settings = await Settings.findOne({ where: { userId: adminUser.id } });
        if (!settings) {
            return res.json({});
        }

        // Only return non-sensitive branding data
        res.json({
            appName: settings.appName,
            appTagline: settings.appTagline,
            logoUrl: settings.logoUrl,
            primaryColor: settings.primaryColor,
            secondaryColor: settings.secondaryColor,
            theme: settings.theme
        });
    } catch (err) {
        console.error("Public Settings Error:", err);
        res.status(500).json({ error: 'Failed to fetch public settings' });
    }
});

// Protect all other routes
router.use(auth);

router.get('/', async (req, res) => {
    try {
        let settings = await Settings.findOne({ where: { userId: req.user.id } });
        // If no settings exist for this user, return empty/default structure but don't create yet to save DB space until save? 
        // Or create default. Let's create default for consistency.
        if (!settings) {
            settings = await Settings.create({ userId: req.user.id });
        }
        res.json(settings);
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
            securityConfig
        } = req.body;

        let settings = await Settings.findOne({ where: { userId: req.user.id } });

        if (!settings) {
            settings = await Settings.create({
                metaPhoneNumberId, metaAccessToken, metaBusinessAccountId,
                appName, supportEmail, currency, timezone,
                primaryColor, secondaryColor, logoUrl,
                theme, language, dateFormat,
                notificationTemplates,
                paymentGateways,
                smtpConfig,
                securityConfig,
                userId: req.user.id
            });
        } else {
            // Update fields if provided (or strictly update all)
            settings.metaPhoneNumberId = metaPhoneNumberId !== undefined ? metaPhoneNumberId : settings.metaPhoneNumberId;
            settings.metaAccessToken = metaAccessToken !== undefined ? metaAccessToken : settings.metaAccessToken;
            settings.metaBusinessAccountId = metaBusinessAccountId !== undefined ? metaBusinessAccountId : settings.metaBusinessAccountId;

            settings.appName = appName || settings.appName;
            settings.supportEmail = supportEmail || settings.supportEmail;
            settings.currency = currency || settings.currency;
            settings.timezone = timezone || settings.timezone;
            settings.primaryColor = primaryColor || settings.primaryColor;
            settings.secondaryColor = secondaryColor || settings.secondaryColor;
            settings.logoUrl = logoUrl || settings.logoUrl;
            settings.theme = theme || settings.theme;
            settings.language = language || settings.language;
            settings.dateFormat = dateFormat || settings.dateFormat;

            if (notificationTemplates) {
                settings.notificationTemplates = notificationTemplates;
            }
            if (paymentGateways) {
                settings.paymentGateways = paymentGateways;
            }
            if (smtpConfig) {
                settings.smtpConfig = smtpConfig;
            }
            if (securityConfig) {
                settings.securityConfig = securityConfig;
            }

            await settings.save();
        }

        // Log Activity
        await logActivity(req, 'Settings Updated', 'Updated application settings');

        // Auto-subscribe to WABA webhooks whenever Meta credentials are saved
        if (settings.metaBusinessAccountId && settings.metaAccessToken) {
            try {
                const subRes = await fetch(
                    `https://graph.facebook.com/v19.0/${settings.metaBusinessAccountId}/subscribed_apps`,
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

        res.json(settings);
    } catch (err) {
        console.error('[SETTINGS] Save error:', err.message, err.stack?.split('\n')[1]);
        res.status(400).json({ error: err.message });
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
            `https://graph.facebook.com/v19.0/${wabaId}/subscribed_apps`,
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

router.post('/test', async (req, res) => {
    try {
        const { metaPhoneNumberId, metaAccessToken } = req.body;

        if (!metaPhoneNumberId || !metaAccessToken) {
            return res.status(400).json({ error: 'Phone Number ID and Access Token are required.' });
        }

        // Verify with Meta Graph API
        // If a test phone number is provided, try to send a message
        if (req.body.testPhoneNumber) {
            const messageResponse = await fetch(`https://graph.facebook.com/v17.0/${metaPhoneNumberId}/messages`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${metaAccessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    messaging_product: 'whatsapp',
                    to: req.body.testPhoneNumber,
                    type: 'template',
                    template: {
                        name: 'hello_world',
                        language: { code: 'en_US' }
                    }
                })
            });

            const messageData = await messageResponse.json();

            if (messageResponse.ok) {
                return res.json({
                    success: true,
                    message: 'Connection successful! Test message sent.',
                    data: messageData
                });
            } else {
                console.error("Meta API Message Send Failed:", messageData);
                return res.status(400).json({
                    error: messageData.error?.message || 'Failed to send test message.',
                    details: messageData.error
                });
            }
        }

        // Fallback: Just check GET request if no phone number (Verification only)
        const response = await fetch(`https://graph.facebook.com/v17.0/${metaPhoneNumberId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${metaAccessToken}`
            }
        });

        const data = await response.json();

        if (response.ok) {
            res.json({ success: true, message: 'Credentials verified successfully.', data });
        } else {
            console.error("Meta API Verification Failed:", data);

            let errorMessage = data.error?.message || 'Connection failed.';

            // Add helpful context based on Meta error codes
            if (data.error?.code === 190) errorMessage += " (Invalid or Expired Access Token)";
            if (response.status === 404) errorMessage += " (Phone Number ID not found. Check if the ID is correct.)";

            res.status(400).json({
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
        const { host, port, user, pass, secure, fromEmail } = req.body;

        if (!host || !port || !user || !pass) {
            return res.status(400).json({ error: 'Missing required SMTP credentials.' });
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
            subject: 'SMTP Connection Test - WhatsApp Cloud',
            text: 'If you received this email, your SMTP configuration is working correctly!',
            html: '<b>SMTP Connection Successful!</b><br>Your email settings are correctly configured.'
        });

        res.json({ success: true, message: 'Connection verified and test email sent.' });

    } catch (err) {
        console.error("Test SMTP error:", err);
        res.status(500).json({ error: `Connection failed: ${err.message}` });
    }
});

// Upload Logo
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const logoUploadDir = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(logoUploadDir)) {
    fs.mkdirSync(logoUploadDir, { recursive: true });
}

const logoStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, logoUploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = `logo-${Date.now()}${path.extname(file.originalname)}`;
        cb(null, uniqueSuffix);
    }
});

const logoUpload = multer({
    storage: logoStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
    fileFilter: (req, file, cb) => {
        if (/image\/(png|jpg|jpeg|svg\+xml|webp)/.test(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed (PNG, JPG, SVG, WEBP)'));
        }
    }
});

router.post('/upload-logo', logoUpload.single('logo'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const protocol = req.headers['x-forwarded-proto'] || req.protocol;
        const host = req.headers['x-forwarded-host'] || req.get('host');
        const publicUrl = `${protocol}://${host}/uploads/${req.file.filename}`;

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

module.exports = router;
