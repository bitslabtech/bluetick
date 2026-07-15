const express = require('express');
const router = express.Router();
const AdminNotification = require('../models/AdminNotification');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

// 1. GET /api/admin-notifications - Fetch Notifications (Limit 50)
router.get('/', [auth, admin], async (req, res) => {
    try {
        const notifications = await AdminNotification.findAll({
            order: [['createdAt', 'DESC']],
            limit: 50
        });

        // Count unread
        const unreadCount = await AdminNotification.count({ where: { isRead: false } });

        res.json({ notifications, unreadCount });
    } catch (err) {
        console.error("Fetch Admin Notifications Error:", err);
        res.status(500).json({ error: 'Server Error' });
    }
});

// 2. PUT /api/admin-notifications/:id/read - Mark Single as Read
router.put('/:id/read', [auth, admin], async (req, res) => {
    try {
        await AdminNotification.update({ isRead: true }, { where: { id: req.params.id } });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Server Error' });
    }
});

// 3. PUT /api/admin-notifications/read-all - Mark All Read
router.put('/read-all', [auth, admin], async (req, res) => {
    try {
        await AdminNotification.update({ isRead: true }, { where: { isRead: false } });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Server Error' });
    }
});

// 4. DELETE /api/admin-notifications/:id - Delete Notification
router.delete('/:id', [auth, admin], async (req, res) => {
    try {
        await AdminNotification.destroy({ where: { id: req.params.id } });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Server Error' });
    }
});

// 5. DELETE /api/admin-notifications/clear-all - Clear All Notifications
router.delete('/clear-all', [auth, admin], async (req, res) => {
    try {
        await AdminNotification.destroy({ truncate: true });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Server Error' });
    }
});

// 6. POST /api/admin-notifications/public/crash-report - Log Frontend Crash
router.post('/public/crash-report', async (req, res) => {
    try {
        const { message, stack, url, userId } = req.body;
        if (!message) return res.status(400).json({ error: 'Message required' });

        const Op = require('sequelize').Op;
        const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);

        // Check if same exact crash occurred in the last 48 hours
        const existing = await AdminNotification.findOne({
            where: {
                type: 'SYSTEM_ERROR',
                message: message,
                createdAt: { [Op.gte]: fortyEightHoursAgo }
            }
        });

        if (existing) {
            // Deduplicate: increment occurrences
            const data = existing.data || {};
            const count = (data.occurrences || 1) + 1;
            await existing.update({
                data: { ...data, occurrences: count, lastSeen: new Date(), lastUrl: url },
                isRead: false // Mark unread again to bring it to admin's attention
            });
            return res.json({ success: true, deduplicated: true, occurrences: count });
        }

        // Create new
        await AdminNotification.create({
            type: 'SYSTEM_ERROR',
            message: message,
            data: {
                stack: stack,
                url: url,
                occurrences: 1,
                userId: userId || 'anonymous'
            }
        });

        res.json({ success: true, created: true });
    } catch (err) {
        console.error("Crash Report Error:", err);
        res.status(500).json({ error: 'Server Error' });
    }
});

module.exports = router;
