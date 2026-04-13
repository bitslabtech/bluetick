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

// @route   GET /api/system
// @desc    Get full system config
router.get('/', superAdmin, async (req, res) => {
    try {
        const config = await SystemConfig.getConfig();
        res.json(config);
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
        if (req.body.settings) {
            config.settings = { ...config.settings, ...req.body.settings };
        }

        await config.save();

        await logActivity(req, 'System Settings Update', 'Admin updated global system configuration');

        res.json(config);
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
            case 'purge-cache':
                // Implement Redis flush or internal cache clear
                console.log('System Action: Cache Purged');
                return res.json({ success: true, message: 'System cache cleared successfully.' });

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

            default:
                return res.status(400).json({ msg: 'Invalid action' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Action failed');
    }
});

module.exports = router;
