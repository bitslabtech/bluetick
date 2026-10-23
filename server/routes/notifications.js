const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const SystemNotification = require('../models/SystemNotification');
const User = require('../models/User');
const Plan = require('../models/Plan');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

// 1. GET /api/notifications - Fetch Notifications for Current User
// 1. GET /api/notifications - Fetch Notifications for Current User
// 1. GET /api/notifications - Fetch Notifications for Current User
router.get('/', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findByPk(userId);

        let whereCondition = { status: 'Sent' };

        // For SuperAdmins, show all sent messages so they can see history easily
        if (!req.user.isAdmin) {
            whereCondition = {
                status: 'Sent',
                createdAt: { [Op.gte]: user.createdAt }, // Only show notifications after joining
                [Op.or]: [
                    { recipient: 'All Users' },
                    { recipient: req.user.email }, // Targeted at specific user email
                    { target: `Plan: ${user?.plan || 'Free'}` } // Targeted at specific plan
                ]
            };
        }

        const notifications = await SystemNotification.findAll({
            where: whereCondition,
            order: [['createdAt', 'DESC']],
            limit: 50
        });

        res.json(notifications);
    } catch (err) {
        console.error("Fetch Notifications Error:", err);
        res.status(500).json({ error: 'Server Error' });
    }
});

// 2. POST /api/notifications - Create New Broadcast (Admin Only)
router.post('/', [auth, admin], async (req, res) => {
    try {
        const { title, message, type, targetType, targetValue, buttonName, buttonUrl } = req.body;

        if (!title || !message) {
            return res.status(400).json({ error: 'Title and Message are required' });
        }

        let recipient = 'All Users';
        let target = 'All Users';

        // Targeting Logic
        if (targetType === 'Specific User') {
            const targetedUser = await User.findByPk(targetValue);
            if (!targetedUser) return res.status(404).json({ error: 'User not found' });
            recipient = targetedUser.email; // Store email as recipient identifier
            target = `User: ${targetedUser.name} (${targetedUser.email})`;
        } else if (targetType === 'Plan Subscribers') {
            const plan = await Plan.findOne({ where: { [Op.or]: [{ id: targetValue }, { name: targetValue }] } });
            if (!plan) return res.status(404).json({ error: 'Plan not found' });

            recipient = 'Plan Subscribers';
            target = `Plan: ${plan.name}`;
        }

        const newNotification = await SystemNotification.create({
            title,
            message,
            type: type || 'Info',
            recipient,
            target,
            buttonName: buttonName || null,
            buttonUrl: buttonUrl || null,
            status: 'Sent'
        });

        res.json(newNotification);
    } catch (err) {
        console.error("Create Notification Error:", err);
        res.status(500).json({ error: 'Server Error' });
    }
});

// 3. DELETE /api/notifications/:id - Delete Notification (Admin Only)
router.delete('/:id', [auth, admin], async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await SystemNotification.destroy({ where: { id } });
        if (!deleted) return res.status(404).json({ error: 'Notification not found' });
        res.json({ message: 'Notification deleted' });
    } catch (err) {
        console.error("Delete Notification Error:", err);
        res.status(500).json({ error: 'Server Error' });
    }
});

// ── Inactivity Notification Management (Admin Only) ─────────────────────────
const {
    getInactivityConfig,
    updateInactivityConfig,
    previewInactiveUsers,
    processInactivityNotifications,
    getInactivityLogs
} = require('../utils/inactivityNotifier');

// 4. GET /api/notifications/inactivity/config
router.get('/inactivity/config', [auth, admin], async (req, res) => {
    try {
        const config = await getInactivityConfig();
        const inactiveUsers = await previewInactiveUsers();
        res.json({
            config,
            currentInactiveCount: inactiveUsers.length,
            alreadyAlertedCount: inactiveUsers.filter(u => u.alreadyAlerted).length,
            pendingAlertCount: inactiveUsers.filter(u => !u.alreadyAlerted).length
        });
    } catch (err) {
        console.error("Get Inactivity Config Error:", err);
        res.status(500).json({ error: 'Server Error' });
    }
});

// 5. PUT /api/notifications/inactivity/config
router.put('/inactivity/config', [auth, admin], async (req, res) => {
    try {
        const updated = await updateInactivityConfig(req.body);
        res.json({ message: 'Inactivity notification configuration updated', config: updated });
    } catch (err) {
        console.error("Update Inactivity Config Error:", err);
        res.status(500).json({ error: 'Failed to update inactivity configuration' });
    }
});

// 6. GET /api/notifications/inactivity/preview
router.get('/inactivity/preview', [auth, admin], async (req, res) => {
    try {
        const { days, targetType, targetPlans } = req.query;
        let parsedPlans = [];
        if (targetPlans) {
            try {
                parsedPlans = Array.isArray(targetPlans) ? targetPlans : JSON.parse(targetPlans);
            } catch {
                parsedPlans = String(targetPlans).split(',').map(s => s.trim()).filter(Boolean);
            }
        }

        const users = await previewInactiveUsers({
            days: days ? parseInt(days) : undefined,
            targetType: targetType || undefined,
            targetPlans: parsedPlans.length > 0 ? parsedPlans : undefined
        });

        res.json({
            count: users.length,
            users
        });
    } catch (err) {
        console.error("Preview Inactive Users Error:", err);
        res.status(500).json({ error: 'Failed to preview inactive users' });
    }
});

// 7. POST /api/notifications/inactivity/trigger — Trigger Check & Send Now (Manual)
router.post('/inactivity/trigger', [auth, admin], async (req, res) => {
    try {
        const { force, days, targetType, targetPlans, templateName, languageCode, hasButtonUrl, buttonUrl } = req.body;
        const result = await processInactivityNotifications({
            force: force !== undefined ? Boolean(force) : true,
            days: days ? parseInt(days) : undefined,
            targetType: targetType || undefined,
            targetPlans: targetPlans || undefined,
            templateName: templateName || undefined,
            languageCode: languageCode || undefined,
            hasButtonUrl: hasButtonUrl !== undefined ? Boolean(hasButtonUrl) : undefined,
            buttonUrl: buttonUrl !== undefined ? String(buttonUrl).trim() : undefined
        });

        res.json(result);
    } catch (err) {
        console.error("Trigger Inactivity Notifications Error:", err);
        res.status(500).json({ error: err.message || 'Failed to trigger notifications' });
    }
});

// 8. GET /api/notifications/inactivity/logs
router.get('/inactivity/logs', [auth, admin], async (req, res) => {
    try {
        const logs = await getInactivityLogs(req.query.limit || 50);
        res.json(logs);
    } catch (err) {
        console.error("Get Inactivity Logs Error:", err);
        res.status(500).json({ error: 'Failed to fetch logs' });
    }
});

module.exports = router;

