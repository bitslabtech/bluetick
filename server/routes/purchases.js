const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const Invoice = require('../models/Invoice');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

// Protect all routes
router.use(auth, admin);

// GET Unread Purchases Count (includes PENDING_APPROVAL for manual payments)
router.get('/unread-count', async (req, res) => {
    try {
        const count = await Transaction.count({
            where: { isRead: false, status: ['COMPLETED', 'PENDING_APPROVAL'] }
        });
        res.json({ count });
    } catch (err) {
        console.error("Fetch Unread Purchases Error:", err);
        res.status(500).json({ error: 'Server Error' });
    }
});

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

        // 2. Hydrate User Details and Invoices
        const userIds = [...new Set(transactions.map(t => t.userId))];
        const users = await User.findAll({
            where: { id: userIds },
            attributes: ['id', 'name', 'email', 'phone', 'company', 'createdAt']
        });

        const transactionIds = transactions.map(t => t.id);
        const invoices = await Invoice.findAll({
            where: { transactionId: transactionIds },
            attributes: ['id', 'transactionId', 'invoiceNumber']
        });

        const enrichedTransactions = transactions.map(t => {
            const user = users.find(u => u.id === t.userId);
            const invoice = invoices.find(i => i.transactionId === t.id);
            const tJson = t.toJSON();
            return {
                ...tJson,
                user: user ? { 
                    name: user.name, 
                    email: user.email,
                    phone: user.phone,
                    company: user.company,
                    createdAt: user.createdAt 
                } : { name: 'Unknown User', email: 'N/A' },
                invoice: invoice ? { id: invoice.id, invoiceNumber: invoice.invoiceNumber } : null,
                // Manual payment fields exposed for admin review
                manualPaymentRef: tJson.manualPaymentRef || null,
                manualPaymentNote: tJson.manualPaymentNote || null
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

        // Mark fetched transactions as read asynchronously
        const unreadIds = transactions.filter(t => !t.isRead).map(t => t.id);
        if (unreadIds.length > 0) {
            Transaction.update({ isRead: true }, { where: { id: unreadIds } }).catch(err => console.error("Failed to mark transactions as read:", err));
        }

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

        // Count Pending Manual Payments
        const pendingManualCount = await Transaction.count({
            where: { status: 'PENDING_APPROVAL', paymentGateway: 'manual' }
        });

        res.json({
            todayRevenue: todayRevenue || 0,
            totalRevenue: totalRevenue || 0,
            failedTransactions: failedCount,
            pendingManualPayments: pendingManualCount
        });

    } catch (err) {
        console.error("Purchase Stats Error:", err);
        res.status(500).json({ error: 'Server Error' });
    }
});

module.exports = router;
