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

module.exports = router;
