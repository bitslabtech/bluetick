const express = require('express');
const router = express.Router();
const SystemConfig = require('../models/SystemConfig');
const Message = require('../models/Message');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const fs = require('fs');
const path = require('path');
const { sequelize } = require('../config/database');

const logActivity = require('../utils/logger'); // Import Logger

// Middleware: Ensure Super Admin (skipped for now, using standard admin)
const superAdmin = [auth, admin];

// ── Security: Mask sensitive values before sending to client ──
const MASK = '••••••••';
const isMasked = (val) => typeof val === 'string' && val.startsWith('••••••••');

const maskSecret = (value) => {
    if (!value || typeof value !== 'string') return value;
    if (value.length <= 4) return MASK;
    return MASK + value.slice(-4);
};

const maskSystemConfigForClient = (config) => {
    const json = config.toJSON ? config.toJSON() : { ...config };

    // Mask S3 storage credentials
    if (json.settings?.storage?.s3) {
        const s3 = json.settings.storage.s3;
        if (s3.accessKeyId) s3.accessKeyId = maskSecret(s3.accessKeyId);
        if (s3.secretAccessKey) s3.secretAccessKey = maskSecret(s3.secretAccessKey);
    }

    // Mask Google OAuth credentials
    if (json.integrations?.google) {
        const g = json.integrations.google;
        if (g.clientSecret) g.clientSecret = maskSecret(g.clientSecret);
    }

    return json;
};

// @route   GET /api/system
// @desc    Get full system config
router.get('/', superAdmin, async (req, res) => {
    try {
        const config = await SystemConfig.getConfig();
        const configJson = maskSystemConfigForClient(config);

        // Attach linked admin user details
        if (configJson.settings && configJson.settings.linkedAdminUserId) {
            const User = require('../models/User');
            const linkedUser = await User.findByPk(configJson.settings.linkedAdminUserId, {
                attributes: ['id', 'name', 'email', 'phone', 'plan']
            });
            configJson.linkedAdminUser = linkedUser;
        }

        res.json(configJson);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/system/referral-stats
// @desc    Get aggregate stats for Referrals program
router.get('/referral-stats', superAdmin, async (req, res) => {
    try {
        const User = require('../models/User');
        const ReferralReward = require('../models/ReferralReward');

        // Total users joined via referral (referredBy is not null)
        const totalJoined = await User.count({ where: { referredBy: { [require('sequelize').Op.not]: null } } });

        // Total rewards given 
        const totalRewards = await ReferralReward.count();

        // Unique referrers (people who have referred someone)
        const uniqueReferrers = await User.count({
            distinct: true,
            col: 'referredBy',
            where: { referredBy: { [require('sequelize').Op.not]: null } }
        });

        res.json({ totalJoined, totalRewards, uniqueReferrers });
    } catch (err) {
        console.error('Referral Stats Error:', err);
        res.status(500).json({ error: 'Server Error' });
    }
});

// @route   PUT /api/system/settings
// @desc    Update system settings (Maintenance, Announcement, etc)
router.put('/settings', superAdmin, async (req, res) => {
    try {
        const config = await SystemConfig.getConfig();

        // Update fields if present in body
        if (req.body.maintenanceMode !== undefined) config.maintenanceMode = req.body.maintenanceMode;
        if (req.body.throughputLimit !== undefined) config.throughputLimit = req.body.throughputLimit;
        if (req.body.version !== undefined) config.version = req.body.version;
        if (req.body.globalAnnouncement) config.globalAnnouncement = req.body.globalAnnouncement;
        if (req.body.ipBlacklist) config.ipBlacklist = req.body.ipBlacklist;
        if (req.body.menuOrder) config.menuOrder = req.body.menuOrder;
        if (req.body.integrations) {
            // Preserve existing Google clientSecret if client sent back masked value
            const existingIntegrations = config.integrations || {};
            const safeIntegrations = { ...req.body.integrations };
            if (safeIntegrations.google?.clientSecret && isMasked(safeIntegrations.google.clientSecret)) {
                safeIntegrations.google.clientSecret = existingIntegrations.google?.clientSecret || '';
            }
            config.integrations = { ...existingIntegrations, ...safeIntegrations };
        }
        if (req.body.settings) {
            // Preserve existing S3 secrets if client sent back masked values
            const existingSettings = config.settings || {};
            const safeSettings = { ...req.body.settings };
            if (safeSettings.storage?.s3) {
                const existingS3 = existingSettings.storage?.s3 || {};
                if (safeSettings.storage.s3.accessKeyId && isMasked(safeSettings.storage.s3.accessKeyId)) {
                    safeSettings.storage.s3.accessKeyId = existingS3.accessKeyId || '';
                }
                if (safeSettings.storage.s3.secretAccessKey && isMasked(safeSettings.storage.s3.secretAccessKey)) {
                    safeSettings.storage.s3.secretAccessKey = existingS3.secretAccessKey || '';
                }
            }
            config.settings = { ...existingSettings, ...safeSettings };
            config.changed('settings', true);
            const cacheManager = require('../utils/cacheManager');
            cacheManager.invalidate('public_settings');
        }

        await config.save();

        await logActivity(req, 'System Settings Update', 'Admin updated global system configuration');

        // Return masked version — secrets are never sent to the browser
        res.json(maskSystemConfigForClient(config));
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});



// @route   GET /api/system/status
// @desc    Get public system status (Announcement, Maintenance) - Accessible to all logged in users
router.get('/status', auth, async (req, res) => {
    try {
        const config = await SystemConfig.getConfig();
        res.json({
            maintenanceMode: config.maintenanceMode,
            globalAnnouncement: config.globalAnnouncement,
            version: config.version,
            menuOrder: config.menuOrder
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/system/diagnostics
// @desc    Get system health, queue stats, and logs
router.get('/diagnostics', superAdmin, async (req, res) => {
    try {
        // 1. Queue Stats
        const pendingCount = await Message.count({ where: { status: 'pending' } });
        const failedCount = await Message.count({ where: { status: 'failed' } });

        // 2. Database Health
        let dbStatus = 'disconnected';
        try {
            await sequelize.authenticate();
            dbStatus = 'connected';
        } catch (e) {
            dbStatus = 'error';
        }

        // 3. Logs (Read last 50 lines of server log if exists)
        let logs = 'No log file found.';
        const logPath = path.join(__dirname, '../logs/server.log');
        if (fs.existsSync(logPath)) {
            const data = fs.readFileSync(logPath, 'utf8');
            const lines = data.split('\n');
            logs = lines.slice(-50).join('\n');
        } else {
            // Fallback attempt to read from a generic log file
            try {
                // If you are forcing logs to a file in index.js, read it here.
                // For now, return a placeholder or check "server.log"
                logs = "[System] Log file not configured in standard path.";
            } catch (e) { }
        }

        res.json({
            queue: {
                pending: pendingCount,
                failed: failedCount
            },
            health: {
                database: dbStatus,
                whatsappApi: 'unknown', // Placeholder for real ping
                smtp: 'ready' // Placeholder
            },
            logs: logs,
            uptime: process.uptime()
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// @route   POST /api/system/actions/:action
// @desc    Trigger specific system actions
router.post('/actions/:action', superAdmin, async (req, res) => {
    const { action } = req.params;

    try {
        switch (action) {
            case 'link-crm': {
                const { userId } = req.body;
                if (!userId) return res.status(400).json({ error: 'User ID is required' });

                const User = require('../models/User');
                const Plan = require('../models/Plan');
                const targetUser = await User.findByPk(userId);
                
                if (!targetUser) return res.status(404).json({ error: 'User not found' });

                // Ensure a System CRM plan exists
                let crmPlan = await Plan.findOne({ where: { name: 'System CRM' } });
                if (!crmPlan) {
                    crmPlan = await Plan.create({
                        name: 'System CRM',
                        description: 'Unlimited Internal Plan for App Communications',
                        price: 0,
                        messageLimit: 999999999,
                        contactLimit: 999999999,
                        templateLimit: 999,
                        teamMemberLimit: 999,
                        features: ['Unlimited']
                    });
                }

                // Upgrade User
                targetUser.plan = 'System CRM';
                targetUser.aiTokenBalance = 999999999;
                targetUser.isAdmin = false; // Ensure they are a STANDARD user so they can access the normal dashboard
                await targetUser.save();

                // Link to config
                const config = await SystemConfig.getConfig();
                if (!config.settings) config.settings = {};
                config.settings.linkedAdminUserId = targetUser.id;
                // Important: Need to flag Sequelize that JSON changed
                config.changed('settings', true); 
                await config.save();

                return res.json({ success: true, message: `Successfully linked ${targetUser.email} as the Official Communications Account.` });
            }

            case 'create-crm': {
                const { name, email, phone, password } = req.body;
                if (!name || !email || !phone || !password) return res.status(400).json({ error: 'All fields are required' });

                const User = require('../models/User');
                const Plan = require('../models/Plan');
                const bcrypt = require('bcryptjs');

                let existing = await User.findOne({ where: { email } });
                if (existing) return res.status(400).json({ error: 'User with this email already exists.' });

                // Ensure a System CRM plan exists
                let crmPlan = await Plan.findOne({ where: { name: 'System CRM' } });
                if (!crmPlan) {
                    crmPlan = await Plan.create({
                        name: 'System CRM',
                        description: 'Unlimited Internal Plan for App Communications',
                        price: 0,
                        messageLimit: 999999999,
                        contactLimit: 999999999,
                        templateLimit: 999,
                        teamMemberLimit: 999,
                        features: ['Unlimited']
                    });
                }

                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash(password, salt);

                const newUser = await User.create({
                    name,
                    email,
                    phone,
                    password: hashedPassword,
                    plan: 'System CRM',
                    aiTokenBalance: 999999999,
                    isAdmin: false // Ensure they are a STANDARD user
                });

                // Link to config
                const config = await SystemConfig.getConfig();
                if (!config.settings) config.settings = {};
                config.settings.linkedAdminUserId = newUser.id;
                config.changed('settings', true); 
                await config.save();

                return res.json({ success: true, message: `Successfully created and linked new Communications Account.` });
            }

            case 'sync-crm-contacts': {
                const config = await SystemConfig.getConfig();
                const linkedAdminId = config.settings?.linkedAdminUserId;
                if (!linkedAdminId) return res.status(400).json({ error: 'No CRM account linked.' });

                const User = require('../models/User');
                const Contact = require('../models/Contact');

                const allUsers = await User.findAll({
                    where: { id: { [require('sequelize').Op.ne]: linkedAdminId } }
                });

                let syncedCount = 0;
                for (let u of allUsers) {
                    if (!u.phone) continue; // Skip if no phone
                    
                    const exists = await Contact.findOne({ where: { userId: linkedAdminId, phone: u.phone } });
                    if (!exists) {
                        await Contact.create({
                            userId: linkedAdminId,
                            name: u.name,
                            phone: u.phone,
                            email: u.email,
                            tags: ['App User', `Plan: ${u.plan}`]
                        });
                        syncedCount++;
                    }
                }

                return res.json({ success: true, message: `Successfully synced ${syncedCount} new contacts to the CRM.` });
            }

            case 'purge-cache':
                const cacheManager = require('../utils/cacheManager');
                const cleared = cacheManager.purgeAll();
                console.log('System Action: Cache Purged');
                return res.json({ success: true, message: `All server caches cleared (${cleared.length} caches: ${cleared.join(', ')}).` });

            case 'kill-sessions':
                const config = await SystemConfig.getConfig();
                config.lastSessionKill = new Date();
                await config.save();
                console.log('System Action: All Sessions Killed');
                return res.json({ success: true, message: 'All active user sessions have been terminated. Users will be logged out on next request.' });

            case 'test-smtp':
                // Fetch Settings
                const Settings = require('../models/Settings');
                const settings = await Settings.findOne({ where: { userId: req.user.id } }); // Assuming global admin settings? 
                // Wait, System SMTP should be global. But our Settings model is per-user usually? 
                // If SAAS, maybe we test the ADMIN's SMTP.
                // Or checking a global system setting?
                // Let's assume we use the requesting admin's configured SMTP for the test.

                if (!settings || !settings.smtpConfig || !settings.smtpConfig.host) {
                    return res.status(400).json({ msg: 'SMTP Config not found in your settings.' });
                }

                const nodemailer = require('nodemailer');
                const transporter = nodemailer.createTransport({
                    host: settings.smtpConfig.host,
                    port: settings.smtpConfig.port,
                    secure: settings.smtpConfig.secure,
                    auth: {
                        user: settings.smtpConfig.user,
                        pass: settings.smtpConfig.pass
                    }
                });

                await transporter.sendMail({
                    from: `"${settings.smtpConfig.fromName}" <${settings.smtpConfig.fromEmail}>`,
                    to: req.user.email, // Send to self
                    subject: 'System Control: SMTP Test',
                    text: 'This is a test email from your System Control Center. SMTP is working correctly! 🚀'
                });

                return res.json({ success: true, message: `Test email sent to ${req.user.email}. Check your inbox!` });

            case 'test-whatsapp':
                // Test WhatsApp API connection
                const SettingsModel = require('../models/Settings');
                const whatsappSettings = await SettingsModel.findOne({ where: { userId: req.user.id } });

                if (!whatsappSettings || !whatsappSettings.metaPhoneNumberId || !whatsappSettings.metaAccessToken) {
                    return res.status(400).json({ msg: 'WhatsApp API credentials not configured. Configure them in Settings > WhatsApp Gateway.' });
                }

                // Verify credentials by fetching phone number info
                const response = await fetch(`https://graph.facebook.com/v17.0/${whatsappSettings.metaPhoneNumberId}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${whatsappSettings.metaAccessToken}`
                    }
                });

                const data = await response.json();

                if (response.ok) {
                    return res.json({
                        success: true,
                        message: `WhatsApp API connection successful! Phone: ${data.display_phone_number || 'Connected'}`
                    });
                } else {
                    return res.status(400).json({
                        msg: 'WhatsApp API test failed: ' + (data.error?.message || 'Unknown error'),
                        details: data.error
                    });
                }

            case 'test-s3':
                const sysConfig = await SystemConfig.getConfig();
                const s3Conf = sysConfig?.settings?.storage?.s3;
                if (!s3Conf || !s3Conf.accessKeyId || !s3Conf.secretAccessKey || !s3Conf.bucket) {
                    return res.status(400).json({ msg: 'S3 Credentials not fully configured in your global settings.' });
                }

                try {
                    const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');
                    const endpoint = s3Conf.endpoint ? (s3Conf.endpoint.startsWith('http') ? s3Conf.endpoint : `https://${s3Conf.endpoint}`) : undefined;
                    
                    const client = new S3Client({
                        region: s3Conf.region || 'us-east-1',
                        credentials: {
                            accessKeyId: s3Conf.accessKeyId,
                            secretAccessKey: s3Conf.secretAccessKey,
                        },
                        endpoint: endpoint,
                        forcePathStyle: !!endpoint
                    });

                    // We just do a test list on the bucket, limit to 1
                    const command = new ListObjectsV2Command({
                        Bucket: s3Conf.bucket,
                        MaxKeys: 1
                    });

                    await client.send(command);

                    return res.json({ success: true, message: 'Successfully connected to S3 Bucket!' });
                } catch (s3Err) {
                    console.error("Test S3 Error:", s3Err);
                    return res.status(400).json({ msg: 'Failed to connect to S3: ' + s3Err.message });
                }

            case 'test-r2':
                const r2SysConfig = await SystemConfig.getConfig();
                const r2Conf = r2SysConfig?.settings?.storage?.r2;
                if (!r2Conf || !r2Conf.accountId || !r2Conf.accessKeyId || !r2Conf.secretAccessKey || !r2Conf.bucket) {
                    return res.status(400).json({ msg: 'Cloudflare R2 credentials not fully configured in your global settings.' });
                }

                try {
                    const { S3Client: R2S3Client, ListObjectsV2Command: R2ListCmd } = require('@aws-sdk/client-s3');
                    const r2Endpoint = `https://${r2Conf.accountId}.r2.cloudflarestorage.com`;

                    const r2Client = new R2S3Client({
                        region: 'auto',
                        credentials: {
                            accessKeyId: r2Conf.accessKeyId,
                            secretAccessKey: r2Conf.secretAccessKey,
                        },
                        endpoint: r2Endpoint,
                        forcePathStyle: true
                    });

                    const r2Command = new R2ListCmd({
                        Bucket: r2Conf.bucket,
                        MaxKeys: 1
                    });

                    await r2Client.send(r2Command);

                    return res.json({ success: true, message: 'Successfully connected to Cloudflare R2 Bucket!' });
                } catch (r2Err) {
                    console.error("Test R2 Error:", r2Err);
                    return res.status(400).json({ msg: 'Failed to connect to R2: ' + r2Err.message });
                }

            default:
                return res.status(400).json({ msg: 'Invalid action' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Action failed');
    }
});

module.exports = router;
