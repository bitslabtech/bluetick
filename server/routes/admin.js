const express = require('express');
const router = express.Router();
const { Op, Sequelize } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('../models/User');
const MessageLog = require('../models/MessageLog');
const ChatMessage = require('../models/ChatMessage');
const Contact = require('../models/Contact');
const Transaction = require('../models/Transaction');
const ActivityLog = require('../models/ActivityLog');
const SystemNotification = require('../models/SystemNotification');
const AiTokenLog = require('../models/AiTokenLog');
const Message = require('../models/Message');
const Vcard = require('../models/Vcard');
const WaStore = require('../models/WaStore');
const ReferralReward = require('../models/ReferralReward');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const bcrypt = require('bcryptjs'); // Needed for password hashing
const jwt = require('jsonwebtoken'); // Needed for impersonation
const logActivity = require('../utils/logger'); // Import Logger
const { setAuthCookies, clearAuthCookies } = require('../utils/cookieHelper');

// ─── EXIT IMPERSONATION ────────────────────────────────────────────────────────
// This route MUST be placed BEFORE the global auth+admin middleware.
// During impersonation, bt_token belongs to the impersonated (non-admin) user,
// so the admin middleware would block with 403. This route authenticates
// directly via the bt_admin_token backup cookie instead.
router.post('/exit-impersonation', async (req, res) => {
    try {
        const adminToken = req.cookies?.bt_admin_token;
        if (!adminToken) {
            clearAuthCookies(res);
            return res.status(400).json({ error: 'No admin session to restore. Please log in again.' });
        }

        // Verify the admin token is still valid
        const decoded = jwt.verify(adminToken, process.env.JWT_SECRET, { algorithms: ['HS256'] });
        if (!decoded.user?.isAdmin) {
            clearAuthCookies(res);
            return res.status(403).json({ error: 'Invalid admin session.' });
        }

        // Fetch admin user data from DB to return to the frontend
        const adminUser = await User.findByPk(decoded.user.id, {
            attributes: { exclude: ['password', 'fbAccessToken', 'metaAdsToken', 'inviteToken'] }
        });

        if (!adminUser) {
            clearAuthCookies(res);
            return res.status(404).json({ error: 'Admin user not found.' });
        }

        // Restore: set admin token as primary, clear the backup
        setAuthCookies(res, adminToken);
        res.clearCookie('bt_admin_token', { path: '/' });

        res.json({ success: true, message: 'Admin session restored.', adminUser: adminUser.toJSON() });
    } catch (err) {
        console.error('[EXIT IMPERSONATION] Error:', err.message);
        clearAuthCookies(res);
        res.status(401).json({ error: 'Admin session expired. Please log in again.' });
    }
});

// 1. Auth Middleware (all routes below this require admin access)
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
            const end = new Date(endDate);
            // Extend to end of day so the full last selected day is included
            end.setHours(23, 59, 59, 999);
            dateFilter = {
                createdAt: {
                    [Op.between]: [new Date(startDate), end]
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
        // Run aggregate queries concurrently to prevent waterfall delays
        const [
            totalUsers,
            activePlans,
            revenueResult,
            totalMessages,
            deliveredCount,
            failedCount,
            messagesForGraph,
            revenueForGraph,
            recentPurchases,
            planDistribution,
            recentLogs,
            aiTokensForGraph,
            topTokenUsers
        ] = await Promise.all([
            User.count(),
            User.count({ where: { planStatus: 'Active' } }),
            Transaction.aggregate('amount', 'sum', { where: { status: 'COMPLETED', ...dateFilter } }),
            ChatMessage.count({ where: { direction: 'OUTBOUND', ...dateFilter } }),
            ChatMessage.count({ 
                where: { 
                    direction: 'OUTBOUND', 
                    [Op.or]: [
                        Sequelize.where(Sequelize.fn('lower', Sequelize.col('status')), 'delivered'),
                        Sequelize.where(Sequelize.fn('lower', Sequelize.col('status')), 'read')
                    ], 
                    ...dateFilter 
                } 
            }),
            ChatMessage.count({ 
                where: { 
                    direction: 'OUTBOUND', 
                    [Op.and]: [
                        Sequelize.where(Sequelize.fn('lower', Sequelize.col('status')), 'failed')
                    ],
                    ...dateFilter 
                } 
            }),
            ChatMessage.findAll({ attributes: ['createdAt'], where: { direction: 'OUTBOUND', ...dateFilter }, order: [['createdAt', 'ASC']], raw: true }),
            Transaction.findAll({ attributes: ['createdAt', 'amount'], where: { status: 'COMPLETED', ...dateFilter }, order: [['createdAt', 'ASC']], raw: true }),
            Transaction.findAll({ limit: 5, order: [['createdAt', 'DESC']], where: { status: 'COMPLETED', ...dateFilter } }),
            User.findAll({ attributes: ['plan', [sequelize.fn('count', sequelize.col('id')), 'count']], group: ['plan'], raw: true }),
            ActivityLog.findAll({ limit: 7, order: [['createdAt', 'DESC']], where: dateFilter }),
            AiTokenLog.findAll({ attributes: ['createdAt', 'tokensUsed'], where: dateFilter, order: [['createdAt', 'ASC']], raw: true }),
            AiTokenLog.findAll({
                attributes: [
                    'userId',
                    [sequelize.fn('sum', sequelize.col('tokensUsed')), 'totalTokens']
                ],
                include: [{ model: User, attributes: ['name', 'email', 'company'] }],
                where: dateFilter,
                group: ['userId', 'User.id'],
                order: [[sequelize.literal('"totalTokens"'), 'DESC']],
                limit: 5,
                raw: true,
                nest: true
            })
        ]);

        const totalRevenue = revenueResult || 0;
        const deliveryRate = totalMessages > 0 ? ((deliveredCount / totalMessages) * 100).toFixed(1) : 0;
        const failedRate = totalMessages > 0 ? ((failedCount / totalMessages) * 100).toFixed(1) : 0;

        // --- B. GRAPHS (Filtered & Gap-Filled) ---
        const generateDailyBuckets = (start, end) => {
            const buckets = {};
            const current = new Date(start);
            const stop = new Date(end);
            current.setHours(0, 0, 0, 0);
            stop.setHours(0, 0, 0, 0);
            const diffDays = Math.ceil((stop - current) / (1000 * 60 * 60 * 24));
            if (diffDays > 366) return null; 
            while (current <= stop) {
                const key = current.toISOString().split('T')[0];
                buckets[key] = 0;
                current.setDate(current.getDate() + 1);
            }
            return buckets;
        };

        const rangeStart = startDate ? new Date(startDate) : new Date(new Date().setDate(new Date().getDate() - 30));
        const rangeEnd = endDate ? new Date(endDate) : new Date();

        const volumeMap = generateDailyBuckets(rangeStart, rangeEnd) || {};
        messagesForGraph.forEach(msg => {
            const rawDate = msg.createdAt || msg.created_at || msg.date || msg.Date;
            if (rawDate) {
                const d = new Date(rawDate);
                if (!isNaN(d.getTime())) {
                    const key = d.toISOString().split('T')[0];
                    volumeMap[key] = (volumeMap[key] || 0) + 1;
                }
            }
        });

        const messageVolumeRaw = Object.entries(volumeMap).map(([date, count]) => ({ date, count })).sort((a, b) => new Date(a.date) - new Date(b.date));

        const revenueMap = generateDailyBuckets(rangeStart, rangeEnd) || {};
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

        const revenueGrowthRaw = Object.entries(revenueMap).map(([date, amount]) => ({ date, amount })).sort((a, b) => new Date(a.date) - new Date(b.date));

        const tokenMap = generateDailyBuckets(rangeStart, rangeEnd) || {};
        aiTokensForGraph.forEach(log => {
            const rawDate = log.createdAt || log.created_at || log.date;
            const rawTokens = log.tokensUsed || 0;
            if (rawDate) {
                const d = new Date(rawDate);
                if (!isNaN(d.getTime())) {
                    const key = d.toISOString().split('T')[0];
                    tokenMap[key] = (tokenMap[key] || 0) + parseInt(rawTokens);
                }
            }
        });
        const aiTokenVolumeRaw = Object.entries(tokenMap).map(([date, tokens]) => ({ date, tokens })).sort((a, b) => new Date(a.date) - new Date(b.date));

        // Use identity snapshot stored on Transaction row (real name/email at purchase time).
        // This preserves the real identity even after the user account is deleted.
        // For older transactions without a snapshot, fall back to live User lookup.
        const txsNeedingLookup = recentPurchases.filter(t => !t.userName);
        const fallbackUserIds = txsNeedingLookup.map(t => t.userId);
        const fallbackUsers = fallbackUserIds.length > 0
            ? await User.findAll({ where: { id: fallbackUserIds }, attributes: ['id', 'name', 'email'] })
            : [];

        const purchasesWithUser = recentPurchases.map(t => {
            // Prefer snapshot (frozen at purchase time)
            if (t.userName) {
                return {
                    ...t.dataValues,
                    userName: t.userName,
                    userEmail: t.userEmail || 'N/A'
                };
            }
            // Fallback: live User lookup for legacy rows
            const u = fallbackUsers.find(user => user.id === t.userId);
            return {
                ...t.dataValues,
                userName: u ? u.name : 'Unknown User',
                userEmail: u ? u.email : 'N/A'
            };
        });

        // Hydrate log users
        const logUserIds = recentLogs.map(l => l.userId).filter(Boolean);
        const logUsers = await User.findAll({ where: { id: logUserIds }, attributes: ['id', 'name'] });
        const logsWithUser = recentLogs.map(l => {
            const u = logUsers.find(user => user.id === l.userId);
            return {
                ...l.dataValues,
                userName: u ? u.name : 'System'
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
                revenueGrowth: revenueGrowthRaw,
                aiTokenVolume: aiTokenVolumeRaw
            },
            recentPurchases: purchasesWithUser,
            planDistribution,
            activityLogs: logsWithUser,
            topTokenUsers: topTokenUsers
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
            attributes: { exclude: ['password', 'fbAccessToken', 'metaAdsToken', 'inviteToken'] },
            order: [['createdAt', 'DESC']]
        });
        res.json(users);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server Error' });
    }
});

// DELETE User — Soft Delete
// Preserves ALL admin reporting data (Transaction, AiTokenLog, MessageLog, ActivityLog)
// while removing operational content and blocking login.
router.delete('/users/:id', async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        if (user.id === req.user.id) {
            return res.status(400).json({ error: 'Cannot delete yourself' });
        }

        const crypto = require('crypto');
        const { Op } = require('sequelize');
        const uid = user.id;

        // Log the action FIRST while real data is still available
        await logActivity(req, 'Delete User', `Admin soft-deleted user ${user.email} (ID: ${user.id})`);

        // ── Step 1: Delete child records that have no direct userId FK ──────────
        // Must be deleted BEFORE their parent to avoid FK constraint errors.
        try {
            // WaStore children
            await sequelize.query(`DELETE FROM "WaProducts" WHERE "storeId" IN (SELECT id FROM "WaStores" WHERE "userId" = :uid)`, { replacements: { uid } });
            await sequelize.query(`DELETE FROM "WaOrders" WHERE "storeId" IN (SELECT id FROM "WaStores" WHERE "userId" = :uid)`, { replacements: { uid } });
            await sequelize.query(`DELETE FROM "WaStoreCoupons" WHERE "storeId" IN (SELECT id FROM "WaStores" WHERE "userId" = :uid)`, { replacements: { uid } });
            // Conversation children
            await sequelize.query(`DELETE FROM "ChatMessages" WHERE "conversationId" IN (SELECT id FROM "Conversations" WHERE "userId" = :uid)`, { replacements: { uid } });
            // Contact children
            await sequelize.query(`DELETE FROM "ContactMessages" WHERE "contactId" IN (SELECT id FROM "Contacts" WHERE "userId" = :uid)`, { replacements: { uid } });
            await sequelize.query(`DELETE FROM "ContactFlowStates" WHERE "contactId" IN (SELECT id FROM "Contacts" WHERE "userId" = :uid)`, { replacements: { uid } });
        } catch (e) {
            console.warn('[ADMIN DELETE] Nested cleanup warning (non-fatal):', e.message);
        }

        // ── Step 2: Delete direct-userId operational models ────────────────────
        // ⚠️  INTENTIONALLY EXCLUDED to preserve admin dashboard reports:
        //     Transaction, AiTokenLog, MessageLog, ActivityLog
        const OPERATIONAL_MODELS_WITH_USERID = [
            'WaStore',          // parent safe after step 1 cleaned children
            'VcardEnquiry', 'Vcard',
            'NfcOrder', 'NfcCard',
            'TechPartnerPayout', // has userId field
            'TechPartner',
            'MetaAdCampaign',
            'FlowExecutionLog', 'Flow',
            'FormResponse', 'Form',
            'Message',          // outbox campaign messages (NOT MessageLog aggregate)
            'Conversation',
            'Contact',
            'ApiUsageLog', 'ApiKey', 'Webhook',
            'Group', 'Label', 'QuickReply', 'AutoTagRule',
            'Campaign', 'Template',
            'MediaFile',
            'PaymentSession',
            'UserAddon',
            'SystemNotification',
        ];

        for (const modelName of OPERATIONAL_MODELS_WITH_USERID) {
            try {
                const Model = require(`../models/${modelName}`);
                if (Model && typeof Model.destroy === 'function') {
                    await Model.destroy({ where: { userId: uid } });
                }
            } catch (e) {
                // Model file may not exist or field name may differ — skip silently
            }
        }

        // ── Step 2b: Models with non-standard FK field names ───────────────────
        try {
            const ReferralReward = require('../models/ReferralReward');
            await ReferralReward.destroy({ where: { [Op.or]: [{ referrerId: uid }, { referredUserId: uid }] } });
        } catch (e) { /* ignore */ }

        try {
            const TechPartnerEarning = require('../models/TechPartnerEarning');
            await TechPartnerEarning.destroy({ where: { [Op.or]: [{ referrerId: uid }, { referredUserId: uid }] } });
        } catch (e) { /* ignore */ }

        // Delete Settings
        try {
            const Settings = require('../models/Settings');
            await Settings.destroy({ where: { userId: uid } });
        } catch (e) { /* ignore */ }

        // ── Step 3: Soft-delete the User row ──────────────────────────────────
        // We KEEP name and email — admin JOINs for Top Token Consumers,
        // Activity Logs, and historical reports rely on these for identity.
        // We CLEAR only auth/security-sensitive fields.
        user.status = 'deleted';
        user.deletedAt = new Date();
        user.password = '$DELETED$' + crypto.randomBytes(32).toString('hex');
        user.fbAccessToken = null;
        user.metaAdsToken = null;
        user.inviteToken = null;
        user.referralCode = null;
        await user.save();

        res.json({ message: 'User deleted successfully.' });
    } catch (err) {
        console.error('[ADMIN DELETE USER]', err);
        res.status(500).json({ error: 'Server Error' });
    }
});

// REACTIVATE User — Reverse a soft-delete
// Restores login access. Operational data (contacts, store, etc.) that was
// cleaned during deletion is gone, but all historical reporting data
// (Transactions, AiTokenLogs, MessageLogs, ActivityLogs) remains intact.
router.patch('/users/:id/reactivate', async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (user.status === 'active') {
            return res.status(400).json({ error: 'User account is already active.' });
        }

        const crypto = require('crypto');
        const bcrypt = require('bcryptjs');

        // Generate a secure temporary password — admin must send a password-reset link
        const tempPassword = crypto.randomBytes(12).toString('hex'); // 24-char random
        const salt = await bcrypt.genSalt(10);
        const hashedTemp = await bcrypt.hash(tempPassword, salt);

        user.status = 'active';
        user.deletedAt = null;
        user.password = hashedTemp; // Temp password; user will need to reset
        await user.save();

        await logActivity(req, 'Reactivate User', `Admin reactivated user ${user.email} (ID: ${user.id})`);

        res.json({
            message: `Account reactivated. A temporary password has been set — please send the user a password reset link so they can regain access.`,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                status: user.status
            }
        });
    } catch (err) {
        console.error('[ADMIN REACTIVATE USER]', err);
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

            // When plan changes, recalculate planStatus and planExpiry properly
            if (plan === 'Free') {
                user.planStatus = 'Active';
                user.planExpiry = null;
            } else {
                const Plan = require('../models/Plan');
                const planDetails = await Plan.findOne({ where: { name: plan } });
                user.planStatus = 'Active';
                if (planDetails) {
                    if (planDetails.interval === 'month') {
                        const expiry = new Date();
                        expiry.setMonth(expiry.getMonth() + 1);
                        user.planExpiry = expiry;
                    } else if (planDetails.interval === 'half-year') {
                        const expiry = new Date();
                        expiry.setMonth(expiry.getMonth() + 6);
                        user.planExpiry = expiry;
                    } else if (planDetails.interval === 'year') {
                        const expiry = new Date();
                        expiry.setFullYear(expiry.getFullYear() + 1);
                        user.planExpiry = expiry;
                    } else {
                        // lifetime — no expiry
                        user.planExpiry = null;
                    }
                }
            }
            changes.push(`Status: -> Active, Expiry recalculated`);
        }

        // Password Update
        if (password && password.trim() !== "") {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(password, salt);
            changes.push("Password updated");
        }

        await user.save();
        
        // --- Update CRM Tags for Upgraded Plan ---
        try {
            if (plan) {
                const SystemConfig = require('../models/SystemConfig');
                const Contact = require('../models/Contact');
                const config = await SystemConfig.getCachedConfig();
                const linkedAdminId = config?.settings?.linkedAdminUserId;
                
                if (linkedAdminId && user.phone) {
                    const contact = await Contact.findOne({ where: { userId: linkedAdminId, phone: user.phone } });
                    if (contact) {
                        let updatedTags = (contact.tags || []).filter(t => typeof t !== 'string' || (!t.startsWith('Plan: ') && !t.endsWith(' - Expired') && t !== 'Trial Expired'));
                        updatedTags.push(`Plan: ${plan}`);
                        contact.tags = updatedTags;
                        await contact.save();
                    }
                }
            }
        } catch (tagSyncErr) {
            console.error("Error syncing CRM tags on admin plan update:", tagSyncErr);
        }

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

// POST Add AI Tokens (Superadmin controlled)
router.post('/users/:id/topup-tokens', async (req, res) => {
    try {
        let { amount } = req.body;
        amount = Number(amount);
        
        if (!amount || isNaN(amount) || amount <= 0) {
            return res.status(400).json({ error: 'Valid positive amount is required' });
        }
        if (amount > 5000) {
            return res.status(400).json({ error: 'Maximum top-up amount at a time is 5,000' });
        }

        const targetUser = await User.findByPk(req.params.id);
        if (!targetUser) return res.status(404).json({ error: 'User not found' });

        const previousBalance = targetUser.aiTokenBalance || 0;
        targetUser.aiTokenBalance = previousBalance + amount;
        await targetUser.save();

        // Log Activity
        await ActivityLog.create({
            userId: req.user.id,
            action: 'AI Tokens Assigned',
            details: `Superadmin manually added ${amount.toLocaleString()} AI tokens to user ${targetUser.email}. Balance changed from ${previousBalance.toLocaleString()} to ${targetUser.aiTokenBalance.toLocaleString()}`
        });

        res.json({ success: true, aiTokenBalance: targetUser.aiTokenBalance });
    } catch (err) {
        console.error("Top-up Tokens Error:", err);
        res.status(500).json({ error: 'Server Error: ' + err.message });
    }
});

// POST Grant Trial to User (Superadmin controlled)
router.post('/users/:id/grant-trial', async (req, res) => {
    try {
        const { planName } = req.body;
        if (!planName) return res.status(400).json({ error: 'Plan name is required' });

        const targetUser = await User.findByPk(req.params.id);
        if (!targetUser) return res.status(404).json({ error: 'User not found' });

        const Plan = require('../models/Plan');
        const reqPlan = await Plan.findOne({ where: { name: planName } });

        if (!reqPlan) return res.status(404).json({ error: 'Plan not found' });
        if (!reqPlan.trialDays || reqPlan.trialDays <= 0) {
            return res.status(400).json({ error: `Plan '${planName}' does not have a configured trial period.` });
        }

        const expiry = new Date();
        expiry.setDate(expiry.getDate() + reqPlan.trialDays);

        await targetUser.update({
            plan: reqPlan.name,
            planStatus: 'Trial',
            planExpiry: expiry
        });

        // Log Activity
        await ActivityLog.create({
            userId: req.user.id,
            action: 'Trial Granted',
            details: `Admin granted ${reqPlan.trialDays}-day trial of ${reqPlan.name} to ${targetUser.email}`
        });

        // --- Update CRM Tags for Granted Trial ---
        try {
            const SystemConfig = require('../models/SystemConfig');
            const Contact = require('../models/Contact');
            const config = await SystemConfig.getCachedConfig();
            const linkedAdminId = config?.settings?.linkedAdminUserId;
            
            if (linkedAdminId && targetUser.phone) {
                const contact = await Contact.findOne({ where: { userId: linkedAdminId, phone: targetUser.phone } });
                if (contact) {
                    let updatedTags = (contact.tags || []).filter(t => typeof t !== 'string' || (!t.startsWith('Plan: ') && !t.endsWith(' - Expired') && t !== 'Trial Expired'));
                    updatedTags.push(`Plan: ${reqPlan.name} (Trial)`);
                    contact.tags = updatedTags;
                    await contact.save();
                }
            }
        } catch (tagSyncErr) {
            console.error("Error syncing CRM tags on grant trial:", tagSyncErr);
        }

        res.json({ success: true, message: `Granted ${reqPlan.trialDays}-day trial for ${reqPlan.name}.`, user: {
            id: targetUser.id, name: targetUser.name, email: targetUser.email, plan: targetUser.plan,
            planStatus: targetUser.planStatus, planExpiry: targetUser.planExpiry, isAdmin: targetUser.isAdmin,
            lastLogin: targetUser.lastLogin, createdAt: targetUser.createdAt
        } });
    } catch (err) {
        console.error("Grant Trial Error:", err);
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
                parentUserId: targetUser.parentUserId,
                teamPolicy: targetUser.teamPolicy,
                origRole: 'Admin' // Flag to indicate impersonation by admin
            }
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h', algorithm: 'HS256' }); // Short-lived token

        // Log Activity
        await ActivityLog.create({
            userId: req.user.id,
            action: 'Impersonation',
            details: `Admin impersonated user: ${targetUser.email}`
        });

        // Set HttpOnly cookies: save current admin token, set impersonated user token
        const currentAdminToken = req.cookies?.bt_token;
        setAuthCookies(res, token, currentAdminToken);
        res.json({ user: payload.user }); // No token in response body

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Impersonation failed' });
    }
});


// GET Full User Details (Profile, Purchases, Usage, Referrals)
router.get('/users/:id/details', async (req, res) => {
    try {
        const userId = req.params.id;
        const targetUser = await User.findByPk(userId);
        
        if (!targetUser) return res.status(404).json({ error: 'User not found' });

        // Run concurrent aggregations
        const [
            purchases,
            contactsCount,
            campaignsCount,
            vcardsCount,
            waStoreCount,
            totalAiTokens,
            referralsCount
        ] = await Promise.all([
            Transaction.findAll({ where: { userId }, order: [['createdAt', 'DESC']] }),
            Contact.count({ where: { userId } }),
            Message.count({ where: { userId } }),
            Vcard.count({ where: { userId } }),
            WaStore.count({ where: { userId } }),
            AiTokenLog.sum('tokensUsed', { where: { userId } }),
            User.count({ where: { referredBy: userId } }) // Total users they referred
        ]);

        // Exclude sensitive fields from response
        const userJson = targetUser.toJSON();
        delete userJson.password;
        delete userJson.fbAccessToken;
        delete userJson.metaAdsToken;
        delete userJson.inviteToken;

        res.json({
            user: userJson,
            purchases,
            usage: {
                contactsCount,
                campaignsCount,
                vcardsCount,
                waStoreCount,
                totalAiTokens: totalAiTokens || 0,
                storageUsed: targetUser.storageUsed || 0 // New field we added
            },
            referralsCount
        });
    } catch (err) {
        console.error("User Details Error:", err);
        res.status(500).json({ error: 'Server Error: ' + err.message });
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

// --- AI Token Users Management ---
router.get('/ai-tokens', async (req, res) => {
    try {
        const { search, sortBy = 'totalTokens', sortDir = 'DESC', page = 1, limit = 20 } = req.query;
        let whereClause = {};

        // 1. Gather User IDs that match the search query (Name or Email)
        if (search) {
            const matchingUsers = await User.findAll({
                attributes: ['id'],
                where: {
                    [Op.or]: [
                        { name: { [Op.iLike]: `%${search}%` } },
                        { email: { [Op.iLike]: `%${search}%` } }
                    ]
                },
                raw: true
            });
            const matchingIds = matchingUsers.map(u => u.id);
            // Even if empty, we set it so AiTokenLog returns 0 results
            whereClause.userId = { [Op.in]: matchingIds };
        }

        const offset = (page - 1) * limit;

        // 2. Fetch the grouped AiTokenLog data
        const tokenLogs = await AiTokenLog.findAll({
            attributes: [
                'userId',
                [sequelize.fn('sum', sequelize.col('tokensUsed')), 'totalTokens'],
                [sequelize.fn('max', sequelize.col('AiTokenLog.createdAt')), 'lastActivity']
            ],
            where: whereClause,
            include: [{
                model: User,
                attributes: ['name', 'email', 'company', 'aiTokenBalance', 'plan']
            }],
            group: ['userId', 'User.id', 'User.name', 'User.email', 'User.company', 'User.aiTokenBalance', 'User.plan'],
            order: [[sequelize.literal(`"${sortBy}"`), sortDir]],
            limit: parseInt(limit, 10),
            offset: parseInt(offset, 10),
            raw: true,
            nest: true
        });

        // 3. To get the 'totalRows' for pagination correctly using grouping, we recount
        const countResult = await AiTokenLog.findAll({
            attributes: [[sequelize.fn('count', sequelize.fn('distinct', sequelize.col('userId'))), 'totalUsers']],
            where: whereClause,
            raw: true
        });

        const totalDocuments = countResult.length > 0 ? parseInt(countResult[0].totalUsers, 10) : 0;
        const totalPages = Math.ceil(totalDocuments / limit);

        res.json({
            users: tokenLogs,
            pagination: {
                totalUsers: totalDocuments,
                totalPages,
                currentPage: parseInt(page, 10)
            }
        });

    } catch (err) {
        console.error("Admin AI Token error:", err);
        res.status(500).json({ error: 'Server Error' });
    }
});

// ─── POST /api/admin/migrate/webp ─────────────────────────────────────────────
// One-time migration: converts existing PNG/JPEG images in the store folders
// of Cloudflare R2 / S3 / local disk to WebP in-place (same key, no DB changes).
//
// Body params (all optional):
//   dryRun    boolean  – true = preview only, false = actually convert (default: true)
//   quality   number   – WebP quality 1-100 (default: 80)
//   folder    string   – only process this folder (e.g. "wastore-products")
router.post('/migrate/webp', async (req, res) => {
    const { dryRun = true, quality = 80, folder: folderFilter = null } = req.body;

    const STORE_FOLDERS = [
        'wastore-logos', 'wastore-covers', 'wastore-seo',
        'wastore-slides', 'wastore-products', 'wastore-categories',
    ];
    const CONVERTIBLE_EXT = new Set(['.jpg', '.jpeg', '.png']);
    const path = require('path');
    const fs = require('fs');

    let sharp;
    try { sharp = require('sharp'); } catch (e) {
        return res.status(500).json({ error: 'Sharp is not installed on the server.' });
    }

    const SystemConfig = require('../models/SystemConfig');
    const { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');

    const fmtBytes = (b) => b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(2)} MB`;

    const streamToBuffer = (stream) => new Promise((resolve, reject) => {
        const chunks = [];
        stream.on('data', c => chunks.push(c));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
        stream.on('error', reject);
    });

    const config = await SystemConfig.getCachedConfig();
    const storageType = config?.settings?.storage?.type || 'local';
    const foldersToProcess = folderFilter ? [folderFilter] : STORE_FOLDERS;

    const log = [];         // Per-file results
    const stats = { converted: 0, skipped: 0, errors: 0, totalSaved: 0 };

    const processBuffer = async (key, inputBuffer) => {
        try {
            const outputBuffer = await sharp(inputBuffer, { failOn: 'none' })
                .rotate()
                .resize(2000, 2000, { fit: 'inside', withoutEnlargement: true })
                .webp({ quality })
                .toBuffer();
            const saved = inputBuffer.length - outputBuffer.length;
            return { outputBuffer, saved };
        } catch (err) {
            throw new Error(`Sharp failed: ${err.message}`);
        }
    };

    try {
        if (storageType === 'r2' || storageType === 's3') {
            const storConf = config.settings.storage[storageType];
            const bucket = storConf.bucket;
            let s3Client, endpoint;

            if (storageType === 'r2') {
                endpoint = `https://${storConf.accountId}.r2.cloudflarestorage.com`;
                s3Client = new S3Client({
                    region: 'auto',
                    credentials: { accessKeyId: storConf.accessKeyId, secretAccessKey: storConf.secretAccessKey },
                    endpoint, forcePathStyle: true,
                });
            } else {
                endpoint = storConf.endpoint
                    ? (storConf.endpoint.startsWith('http') ? storConf.endpoint : `https://${storConf.endpoint}`)
                    : undefined;
                s3Client = new S3Client({
                    region: storConf.region || 'us-east-1',
                    credentials: { accessKeyId: storConf.accessKeyId, secretAccessKey: storConf.secretAccessKey },
                    ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
                });
            }

            for (const folder of foldersToProcess) {
                // List all objects in folder
                let continuationToken;
                const objects = [];
                do {
                    const listResp = await s3Client.send(new ListObjectsV2Command({
                        Bucket: bucket, Prefix: `${folder}/`, ContinuationToken: continuationToken,
                    }));
                    if (listResp.Contents) objects.push(...listResp.Contents);
                    continuationToken = listResp.IsTruncated ? listResp.NextContinuationToken : null;
                } while (continuationToken);

                const images = objects.filter(o => CONVERTIBLE_EXT.has(path.extname(o.Key || '').toLowerCase()));

                for (const obj of images) {
                    const key = obj.Key;
                    if (dryRun) {
                        log.push({ key, status: 'would-convert', originalSize: fmtBytes(obj.Size || 0) });
                        stats.converted++;
                        continue;
                    }
                    try {
                        const getResp = await s3Client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
                        const inputBuffer = await streamToBuffer(getResp.Body);
                        const { outputBuffer, saved } = await processBuffer(key, inputBuffer);

                        if (saved <= 0) {
                            log.push({ key, status: 'skipped', reason: 'already optimal' });
                            stats.skipped++;
                            continue;
                        }

                        await s3Client.send(new PutObjectCommand({
                            Bucket: bucket, Key: key, Body: outputBuffer,
                            ContentType: 'image/webp',
                            Metadata: { 'x-converted-by': 'webp-migration' },
                        }));

                        log.push({ key, status: 'converted', saved: fmtBytes(saved), from: fmtBytes(inputBuffer.length), to: fmtBytes(outputBuffer.length) });
                        stats.converted++;
                        stats.totalSaved += saved;
                    } catch (err) {
                        log.push({ key, status: 'error', error: err.message });
                        stats.errors++;
                    }
                }
            }

        } else {
            // Local disk
            const uploadsDir = path.join(__dirname, '../public/uploads');
            for (const folder of foldersToProcess) {
                const folderPath = path.join(uploadsDir, folder);
                if (!fs.existsSync(folderPath)) continue;
                const files = fs.readdirSync(folderPath).filter(f => CONVERTIBLE_EXT.has(path.extname(f).toLowerCase()));

                for (const file of files) {
                    const filePath = path.join(folderPath, file);
                    const key = `${folder}/${file}`;
                    if (dryRun) {
                        const size = fs.statSync(filePath).size;
                        log.push({ key, status: 'would-convert', originalSize: fmtBytes(size) });
                        stats.converted++;
                        continue;
                    }
                    try {
                        const inputBuffer = fs.readFileSync(filePath);
                        const { outputBuffer, saved } = await processBuffer(key, inputBuffer);
                        if (saved <= 0) { log.push({ key, status: 'skipped', reason: 'already optimal' }); stats.skipped++; continue; }
                        fs.writeFileSync(filePath, outputBuffer);
                        log.push({ key, status: 'converted', saved: fmtBytes(saved) });
                        stats.converted++;
                        stats.totalSaved += saved;
                    } catch (err) {
                        log.push({ key, status: 'error', error: err.message });
                        stats.errors++;
                    }
                }
            }
        }

        return res.json({
            dryRun,
            storageType,
            summary: {
                converted: stats.converted,
                skipped: stats.skipped,
                errors: stats.errors,
                totalSaved: fmtBytes(stats.totalSaved),
            },
            files: log,
        });

    } catch (err) {
        console.error('[WebP Migration] Fatal error:', err);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/admin/fix-whatsapp-data
// One-shot cleanup: finds users where metaPhoneNumberId contains '@' (email saved by mistake)
// and wipes ALL stale WhatsApp fields from both Users and Settings tables.
router.post('/fix-whatsapp-data', async (req, res) => {
    const Settings = require('../models/Settings');
    const isEmailLike = (val) => typeof val === 'string' && val.includes('@');
    const isEmpty = (val) => !val || String(val).trim() === '';

    const report = { usersFixed: [], settingsFixed: [] };

    try {
        // ── Users table ──
        const allUsers = await User.findAll();
        for (const user of allUsers) {
            const badPhone = isEmailLike(user.metaPhoneNumberId);
            const badWaba  = isEmailLike(user.wabaId);
            if (badPhone || badWaba) {
                const before = { metaPhoneNumberId: user.metaPhoneNumberId, wabaId: user.wabaId };
                user.metaPhoneNumberId      = null;
                user.metaDisplayPhoneNumber = null;
                user.metaQualityRating      = null;
                user.metaTier               = null;
                user.metaVerifiedName       = null;
                user.metaNameStatus         = null;
                if (badWaba) user.wabaId    = null;
                await user.save();
                report.usersFixed.push({ userId: user.id, email: user.email, before });
            }
        }

        // ── Settings table ──
        const allSettings = await Settings.findAll();
        for (const s of allSettings) {
            const badPhone = isEmailLike(s.metaPhoneNumberId);
            const badWaba  = isEmailLike(s.metaBusinessAccountId);
            const badToken = isEmailLike(s.metaAccessToken);
            if (badPhone || badWaba || badToken) {
                const before = { metaPhoneNumberId: s.metaPhoneNumberId, metaBusinessAccountId: s.metaBusinessAccountId };
                if (badPhone) s.metaPhoneNumberId     = '';
                if (badWaba)  s.metaBusinessAccountId = '';
                if (badToken) s.metaAccessToken       = '';
                await s.save();
                report.settingsFixed.push({ userId: s.userId, before });
            }
        }

        console.log('[ADMIN FIX-WA] Done:', JSON.stringify(report));
        res.json({
            success: true,
            message: `Fixed ${report.usersFixed.length} user(s) and ${report.settingsFixed.length} settings row(s). Affected users must reconnect WhatsApp.`,
            report
        });
    } catch (err) {
        console.error('[ADMIN FIX-WA] Error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
