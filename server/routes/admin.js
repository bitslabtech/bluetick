const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('../models/User');
const MessageLog = require('../models/MessageLog');
const Contact = require('../models/Contact');
const Transaction = require('../models/Transaction');
const ActivityLog = require('../models/ActivityLog');
const SystemNotification = require('../models/SystemNotification');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const bcrypt = require('bcryptjs'); // Needed for password hashing
const jwt = require('jsonwebtoken'); // Needed for impersonation
const logActivity = require('../utils/logger'); // Import Logger

// 1. Auth Middleware
router.use(auth, admin);

// --- Impersonation History ---
router.get('/impersonation-history', async (req, res) => {
    try {
        const logs = await ActivityLog.findAll({
            where: { action: 'Impersonation' },
            order: [['createdAt', 'DESC']],
            include: [{ model: User, attributes: ['id', 'name', 'email'] }] // The Admin who performed it
        });
        res.json(logs);
    } catch (err) {
        console.error("Impersonation History Error:", err);
        res.status(500).json({ error: 'Server Error' });
    }
});

// --- ACTIVITY LOGS ---
router.get('/activity-logs', async (req, res) => {
    try {
        const logs = await ActivityLog.findAll({
            include: [{ model: User, attributes: ['id', 'name', 'email'] }],
            order: [['createdAt', 'DESC']],
            limit: 100 // Cap for performance
        });
        res.json(logs);
    } catch (err) {
        console.error("Fetch Activity Logs Error:", err);
        res.status(500).json({ error: 'Server Error' });
    }
});

// 2. GET System Stats
router.get('/stats', async (req, res) => {
    try {
        // --- DATE FILTERING ---
        const { startDate, endDate } = req.query;
        let dateFilter = {};

        if (startDate && endDate) {
            dateFilter = {
                createdAt: {
                    [Op.between]: [new Date(startDate), new Date(endDate)] // endDate should probably include end of day, handled by frontend or cast
                }
            };
        } else {
            // Default: Last 30 Days
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            dateFilter = {
                createdAt: { [Op.gte]: thirtyDaysAgo }
            };
        }

        // --- A. KPI CARDS ---
        // Users & Active Plans usually represent "Current State", so we might keep them all-time.
        // But let's filter NEW users if requested? No, usually "Total Users" is the current base.
        // Let's keep Total Users and Active Plans ALL TIME for now, unless specific "New Users" metric is needed.
        const totalUsers = await User.count();
        const activePlans = await User.count({ where: { planStatus: 'Active' } });

        // Total Revenue (Filtered by Date)
        const revenueResult = await Transaction.aggregate('amount', 'sum', {
            where: {
                status: 'COMPLETED',
                ...dateFilter
            }
        });
        const totalRevenue = revenueResult || 0;

        // Message Stats (Filtered by Date)
        const totalMessages = await MessageLog.count({ where: dateFilter });

        // Delivery & Failure Rates (Filtered by Date)
        const deliveredCount = await MessageLog.count({ where: { status: { [Op.in]: ['DELIVERED', 'READ'] }, ...dateFilter } });
        const failedCount = await MessageLog.count({ where: { status: 'FAILED', ...dateFilter } });

        const deliveryRate = totalMessages > 0 ? ((deliveredCount / totalMessages) * 100).toFixed(1) : 0;
        const failedRate = totalMessages > 0 ? ((failedCount / totalMessages) * 100).toFixed(1) : 0;


        // --- B. GRAPHS (Filtered) ---
        // a) Message Volume Trend
        // a) Message Volume Trend (JS Aggregation for Robustness)
        const messagesForGraph = await MessageLog.findAll({
            attributes: ['createdAt'],
            where: dateFilter,
            order: [['createdAt', 'ASC']],
            raw: true
        });

        const volumeMap = {};
        messagesForGraph.forEach(msg => {
            // Robust check for various key casings returned by raw query
            const rawDate = msg.createdAt || msg.created_at || msg.date || msg.Date;
            if (rawDate) {
                const d = new Date(rawDate);
                if (!isNaN(d.getTime())) {
                    const key = d.toISOString().split('T')[0];
                    volumeMap[key] = (volumeMap[key] || 0) + 1;
                }
            }
        });

        // Debug output to help verify keys if empty
        if (messagesForGraph.length > 0) {
            console.log("DEBUG Example Record Keys:", Object.keys(messagesForGraph[0]));
        } else {
            console.log("DEBUG: No messages found in range for graph.");
        }

        const messageVolumeRaw = Object.entries(volumeMap).map(([date, count]) => ({
            logDate: date,
            count
        })).sort((a, b) => new Date(a.logDate) - new Date(b.logDate));

        console.log("DEBUG: messageVolumeRaw", messageVolumeRaw);

        // b) Revenue Growth Trend (JS Aggregation)
        const revenueForGraph = await Transaction.findAll({
            attributes: ['createdAt', 'amount'],
            where: { status: 'COMPLETED', ...dateFilter },
            order: [['createdAt', 'ASC']],
            raw: true
        });

        const revenueMap = {};
        revenueForGraph.forEach(tx => {
            const rawDate = tx.createdAt || tx.created_at || tx.date;
            const rawAmount = tx.amount || 0;

            if (rawDate) {
                const d = new Date(rawDate);
                if (!isNaN(d.getTime())) {
                    const key = d.toISOString().split('T')[0];
                    revenueMap[key] = (revenueMap[key] || 0) + parseFloat(rawAmount);
                }
            }
        });

        const revenueGrowthRaw = Object.entries(revenueMap).map(([date, amount]) => ({
            date, // Keeping 'date' key as originally expected or 'logDate', let's use 'date' to match original
            amount
        })).sort((a, b) => new Date(a.date) - new Date(b.date));


        // --- C. RECENT PURCHASES (limit 5, but respecting filter if applied?) ---
        // Usually "Recent" just means top 5 of all time, but if a filter is active, maybe top 5 IN THAT PERIOD?
        // Let's apply filter.
        const recentPurchases = await Transaction.findAll({
            limit: 5,
            order: [['createdAt', 'DESC']],
            where: {
                status: 'COMPLETED',
                ...dateFilter
            }
        });

        // Hydrate user names for purchases
        const userIds = recentPurchases.map(t => t.userId);
        const purchaseUsers = await User.findAll({
            where: { id: userIds },
            attributes: ['id', 'name', 'email']
        });
        const purchasesWithUser = recentPurchases.map(t => {
            const u = purchaseUsers.find(user => user.id === t.userId);
            return {
                ...t.dataValues,
                userName: u ? u.name : 'Unknown User',
                userEmail: u ? u.email : 'N/A'
            };
        });


        // --- D. PLAN DISTRIBUTION (Pie Chart) ---
        // This is usually "Current Distribution of Active Users". 
        // Formatting strictly by date range for plans is tricky (snapshots).
        // Let's keep this as "Current Snapshot" regardless of date filter, 
        // OR we can filter by "Users created in this range"?
        // Let's keep it as All-Time Snapshot for now as it makes more sense contextually.
        const planDistribution = await User.findAll({
            attributes: ['plan', [sequelize.fn('count', sequelize.col('id')), 'count']],
            group: ['plan'],
            raw: true
        });


        // --- E. ACTIVITY LOGS (Recent 7, filtered) ---
        const recentLogs = await ActivityLog.findAll({
            limit: 7,
            order: [['createdAt', 'DESC']],
            where: dateFilter
        });
        // Hydrate user names for logs
        const logUserIds = recentLogs.map(l => l.userId).filter(Boolean);
        const logUsers = await User.findAll({
            where: { id: logUserIds },
            attributes: ['id', 'name']
        });

        const logsWithUser = recentLogs.map(l => {
            const u = logUsers.find(user => user.id === l.userId);
            return {
                ...l.dataValues,
                userName: u ? u.name : 'System' // or 'Unknown'
            };
        });


        res.json({
            kpi: {
                totalUsers,
                activePlans,
                totalRevenue,
                totalMessages,
                deliveryRate,
                failedRate
            },
            graphs: {
                messageVolume: messageVolumeRaw,
                revenueGrowth: revenueGrowthRaw
            },
            recentPurchases: purchasesWithUser,
            planDistribution,
            activityLogs: logsWithUser
        });

    } catch (err) {
        console.error("Admin Stats Error:", err);
        res.status(500).json({ error: 'Server Error', details: err.message });
    }
});

// --- User Management ---

// GET All Users (Existing - Keeping it for User Management Table if needed, or can be removed if dashboard covers it)
router.get('/users', async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: { exclude: ['password'] },
            order: [['createdAt', 'DESC']]
        });
        res.json(users);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server Error' });
    }
});

// DELETE User
router.delete('/users/:id', async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        if (user.id === req.user.id) {
            return res.status(400).json({ error: 'Cannot delete yourself' });
        }
        await user.destroy();
        await logActivity(req, 'Delete User', `Admin deleted user ${user.email} (ID: ${user.id})`);
        res.json({ message: 'User deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server Error' });
    }
});

// POST Create User
router.post('/users', async (req, res) => {
    try {
        const { name, email, password, role, plan } = req.body;

        // Validation
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Please provide name, email and password' });
        }

        // Check if user exists
        let user = await User.findOne({ where: { email } });
        if (user) {
            return res.status(400).json({ error: 'User with this email already exists' });
        }

        // Hash Password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Set plan expiry based on plan interval from DB
        let planExpiry = null;
        if (plan && plan !== 'Free') {
            const Plan = require('../models/Plan');
            const planDetails = await Plan.findOne({ where: { name: plan } });
            if (planDetails?.interval === 'month') {
                planExpiry = new Date();
                planExpiry.setMonth(planExpiry.getMonth() + 1);
            } else if (planDetails?.interval === 'year') {
                planExpiry = new Date();
                planExpiry.setFullYear(planExpiry.getFullYear() + 1);
            }
            // lifetime → planExpiry stays null
        }

        // Create User
        user = await User.create({
            name,
            email,
            password: hashedPassword,
            isAdmin: role === 'Admin',
            plan: plan || 'Free',
            planExpiry
        });

        // Log Activity
        await ActivityLog.create({
            userId: req.user.id,
            action: 'User Created',
            details: `Admin created user: ${user.email} (${user.id})`
        });

        // Log Activity
        await logActivity(req, 'User Created', `Admin created user: ${user.email} (${user.id})`);

        res.json({
            id: user.id,
            name: user.name,
            email: user.email,
            isAdmin: user.isAdmin,
            plan: user.plan,
            createdAt: user.createdAt
        });

    } catch (err) {
        console.error("Create User Error:", err);
        res.status(500).json({ error: 'Server Error: ' + err.message });
    }
});

// PUT Update User
router.put('/users/:id', async (req, res) => {
    try {
        const { name, email, password, role, plan } = req.body;
        const user = await User.findByPk(req.params.id);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Check Unique Email (if changing)
        if (email && email !== user.email) {
            const exists = await User.findOne({ where: { email } });
            if (exists) {
                return res.status(400).json({ error: 'Email already in use' });
            }
        }

        const changes = [];

        // Update fields
        if (name) {
            if (user.name !== name) changes.push(`Name: ${user.name} -> ${name}`);
            user.name = name;
        }
        if (email) {
            if (user.email !== email) changes.push(`Email: ${user.email} -> ${email}`);
            user.email = email;
        }
        if (role) {
            const newAdminStatus = role === 'Admin';
            if (user.isAdmin !== newAdminStatus) changes.push(`Role: ${user.isAdmin ? 'Admin' : 'User'} -> ${role}`);
            user.isAdmin = newAdminStatus;
        }
        if (plan) {
            if (user.plan !== plan) changes.push(`Plan: ${user.plan} -> ${plan}`);
            user.plan = plan;
            // logic to update expiry could go here
        }

        // Password Update
        if (password && password.trim() !== "") {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(password, salt);
            changes.push("Password updated");
        }

        await user.save();

        // Log Activity
        if (changes.length > 0) {
            await ActivityLog.create({
                userId: req.user.id,
                action: 'User Updated',
                details: `Admin updated user ${user.email}: ${changes.join(', ')}`
            });
        }

        res.json({
            id: user.id,
            name: user.name,
            email: user.email,
            company: user.company,
            isAdmin: user.isAdmin,
            plan: user.plan,
            planStatus: user.planStatus,
            planExpiry: user.planExpiry,
            lastLogin: user.lastLogin,
            createdAt: user.createdAt
        });

    } catch (err) {
        console.error("Update User Error:", err);
        res.status(500).json({ error: 'Server Error: ' + err.message });
    }
});
// POST Impersonate User
router.post('/users/:id/impersonate', async (req, res) => {
    try {
        const targetUser = await User.findByPk(req.params.id);
        if (!targetUser) return res.status(404).json({ error: 'User not found' });

        if (targetUser.isAdmin) return res.status(403).json({ error: 'Cannot impersonate another admin' });

        // Generate Token for Target User
        const payload = {
            user: {
                id: targetUser.id,
                name: targetUser.name,
                email: targetUser.email,
                isAdmin: targetUser.isAdmin,
                origRole: 'Admin' // Flag to indicate impersonation by admin
            }
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' }); // Short-lived token

        // Log Activity
        await ActivityLog.create({
            userId: req.user.id,
            action: 'Impersonation',
            details: `Admin impersonated user: ${targetUser.email}`
        });

        res.json({ token, user: payload.user });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// GET User Impersonation History
router.get('/users/:id/impersonation-history', async (req, res) => {
    try {
        const targetUser = await User.findByPk(req.params.id);
        if (!targetUser) return res.status(404).json({ error: 'User not found' });

        // Find logs where:
        // 1. Action is 'Impersonation' AND details contains user's email (Session Start)
        // 2. OR userId is targetUser.id AND details contains "(Impersonated by" (Actions during session)
        const logs = await ActivityLog.findAll({
            where: {
                [Op.or]: [
                    {
                        action: 'Impersonation',
                        details: { [Op.iLike]: `%${targetUser.email}%` }
                    },
                    {
                        userId: targetUser.id,
                        details: { [Op.iLike]: '%(Impersonated by%' }
                    }
                ]
            },
            order: [['createdAt', 'DESC']]
        });

        // Manually hydrate Admin names since association is missing
        const adminIds = [...new Set(logs.map(log => log.userId).filter(id => id))];
        const admins = await User.findAll({
            where: { id: adminIds },
            attributes: ['id', 'name', 'email']
        });

        const logsWithAdmins = logs.map(log => {
            const admin = admins.find(a => a.id === log.userId);
            return {
                ...log.toJSON(), // Convert to plain object
                User: admin ? { name: admin.name, email: admin.email } : { name: 'Unknown', email: '' }
            };
        });

        res.json(logsWithAdmins);
    } catch (err) {
        console.error("User History Error:", err);
        res.status(500).json({ error: 'Server Error ' + err.message });
    }
});

// --- Activity Logs ---

// GET All Activity Logs
router.get('/activity-logs', async (req, res) => {
    try {
        const { search, action } = req.query;
        let where = {};

        if (action && action !== 'All') {
            where.action = action;
        }

        const logs = await ActivityLog.findAll({
            where,
            order: [['createdAt', 'DESC']],
            include: [{
                model: User,
                attributes: ['id', 'name', 'email']
            }],
            limit: 200 // Cap results for performance
        });

        // Search in memory for flexibility (Action or Details or User Name)
        let finalLogs = logs;
        if (search) {
            const lowerSearch = search.toLowerCase();
            finalLogs = logs.filter(log =>
                log.action.toLowerCase().includes(lowerSearch) ||
                log.details.toLowerCase().includes(lowerSearch) ||
                (log.User && log.User.name.toLowerCase().includes(lowerSearch)) ||
                (log.User && log.User.email.toLowerCase().includes(lowerSearch))
            );
        }

        res.json(finalLogs);
    } catch (err) {
        console.error("Fetch Activity Logs Error:", err);
        res.status(500).json({ error: 'Server Error' });
    }
});

// --- Notification Center ---

// GET Notifications (History)
router.get('/notifications', async (req, res) => {
    try {
        const notifications = await SystemNotification.findAll({
            order: [['createdAt', 'DESC']]
        });
        res.json(notifications);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server Error' });
    }
});

// POST Send Notification
router.post('/notifications', async (req, res) => {
    try {
        const { recipient, type, title, message } = req.body;

        // In a real app, logic to actually send email/push/socket event would go here.
        // For now, we just log it to the DB as "Sent".

        const notification = await SystemNotification.create({
            recipient,
            type,
            title,
            message,
            target: recipient === 'All Users (Broadcast)' ? 'All Users' : 'Single User', // Simplified logic
            status: 'Sent'
        });

        // Log Activity
        await ActivityLog.create({
            action: `Broadcast Sent: ${title} `,
            adminName: 'Superadmin', // In real app, get from req.user
            details: `Sent ${type} notification to ${recipient} `
        });

        res.json(notification);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server Error' });
    }
});

// DELETE Notification
router.delete('/notifications/:id', async (req, res) => {
    try {
        await SystemNotification.destroy({ where: { id: req.params.id } });
        res.json({ message: 'Notification deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server Error' });
    }
});

module.exports = router;
