const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

// Protect all routes
router.use(auth, admin);

// GET All Purchases (with Filters & Pagination)
router.get('/', async (req, res) => {
    try {
        const { status, search, startDate, endDate } = req.query;
        let where = {};

        // Status Filter
        if (status && status !== 'All') {
            where.status = status;
        }

        // Date Filter
        if (startDate && endDate) {
            where.createdAt = {
                [Op.between]: [new Date(startDate), new Date(endDate)]
            };
        }

        // 1. Fetch Transactions first
        const transactions = await Transaction.findAll({
            where,
            order: [['createdAt', 'DESC']],
            limit: 100 // Hard limit for now
        });

        // 2. Hydrate User Details
        // We do this manually to ensure it works regardless of Association config
        const userIds = [...new Set(transactions.map(t => t.userId))];
        const users = await User.findAll({
            where: { id: userIds },
            attributes: ['id', 'name', 'email']
        });

        const enrichedTransactions = transactions.map(t => {
            const user = users.find(u => u.id === t.userId);
            // Search Filter (applied in memory for simplicity over hydrated data)
            return {
                ...t.toJSON(),
                user: user ? { name: user.name, email: user.email } : { name: 'Unknown User', email: 'N/A' }
            };
        });

        // Apply Search (Name or Email or Plan)
        let finalData = enrichedTransactions;
        if (search) {
            const lowerSearch = search.toLowerCase();
            finalData = enrichedTransactions.filter(item =>
                item.user.name.toLowerCase().includes(lowerSearch) ||
                item.user.email.toLowerCase().includes(lowerSearch) ||
                item.planName.toLowerCase().includes(lowerSearch) ||
                item.id.toLowerCase().includes(lowerSearch)
            );
        }

        res.json(finalData);

    } catch (err) {
        console.error("Fetch Purchases Error:", err);
        res.status(500).json({ error: 'Server Error ' + err.message });
    }
});

// GET Stats (Revenue)
router.get('/stats', async (req, res) => {
    try {
        // Today's Revenue
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const todayRevenue = await Transaction.sum('amount', {
            where: {
                status: 'COMPLETED',
                createdAt: { [Op.gte]: startOfDay }
            }
        });

        // Total Revenue (All Time)
        const totalRevenue = await Transaction.sum('amount', {
            where: { status: 'COMPLETED' }
        });

        // Count Failed
        const failedCount = await Transaction.count({
            where: { status: 'FAILED' }
        });

        res.json({
            todayRevenue: todayRevenue || 0,
            totalRevenue: totalRevenue || 0,
            failedTransactions: failedCount
        });

    } catch (err) {
        console.error("Purchase Stats Error:", err);
        res.status(500).json({ error: 'Server Error' });
    }
});

module.exports = router;
