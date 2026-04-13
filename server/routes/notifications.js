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

module.exports = router;
