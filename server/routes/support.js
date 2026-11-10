const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const AdminNotification = require('../models/AdminNotification');
const Ticket = require('../models/Ticket');
const Article = require('../models/Article');
const RoadmapItem = require('../models/RoadmapItem');
const User = require('../models/User');
const SystemNotification = require('../models/SystemNotification');
const auth = require('../middleware/auth');
const logActivity = require('../utils/logger');
const KBCategory = require('../models/KBCategory');
const { sendAdminAlert } = require('../services/systemMessenger');
const { getIo } = require('../socket');
// Multer Setup for KB Images replaced by storageProvider

// Middleware: Verify Auth
router.use(auth);

// --- TICKETS ---

// GET Unread Ticket Count (for sidebar red dot)
// Admin sees count of tickets where user replied (hasUnreadUserReply)
// User sees count of tickets where admin replied (hasUnreadAdminReply)
router.get('/tickets/unread-count', async (req, res) => {
    try {
        const isAdmin = req.user.isAdmin;
        let where = {};

        if (isAdmin) {
            // Admin: tickets where a user has replied and admin hasn't read yet
            where.hasUnreadUserReply = true;
        } else {
            // User: their own tickets where admin has replied and they haven't read yet
            where.userId = req.user.id;
            where.hasUnreadAdminReply = true;
        }

        let roadmapCount = 0;
        if (isAdmin) {
            // Count unseen roadmap items for admin
            const roadmapWhere = {};
            if (req.user.lastSeenRoadmapAt) {
                roadmapWhere.createdAt = { [Op.gt]: req.user.lastSeenRoadmapAt };
            }
            roadmapCount = await RoadmapItem.count({ where: roadmapWhere });
        }

        const count = await Ticket.count({ where });
        res.json({ count, roadmapCount });
    } catch (err) {
        console.error('Ticket Unread Count Error:', err);
        res.status(500).json({ error: 'Server Error' });
    }
});

// POST Mark ticket as read (clears the unread flag for current viewer)
router.post('/tickets/:id/mark-read', async (req, res) => {
    try {
        const ticket = await Ticket.findByPk(req.params.id);
        if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

        // Permission check
        if (!req.user.isAdmin && ticket.userId !== req.user.id) {
            return res.status(403).json({ error: 'Access denied' });
        }

        if (req.user.isAdmin) {
            ticket.hasUnreadUserReply = false;
        } else {
            ticket.hasUnreadAdminReply = false;
        }

        await ticket.save();
        res.json({ success: true });
    } catch (err) {
        console.error('Mark Read Error:', err);
        res.status(500).json({ error: 'Server Error' });
    }
});

// GET My Tickets (User) or All Tickets (Admin)
router.get('/tickets', async (req, res) => {
    try {
        const isAdmin = req.user.isAdmin;
        let where = {};

        // ?myTickets=true forces own-ticket scope (used by user-facing /support page)
        if (!isAdmin || req.query.myTickets === 'true') {
            where.userId = req.user.id;
        }

        const tickets = await Ticket.findAll({
            where,
            order: [['lastReplyAt', 'DESC']],
        });

        // Hydrate User Names for Admin View
        if (isAdmin) {
            const userIds = [...new Set(tickets.map(t => t.userId))];
            const users = await User.findAll({
                where: { id: userIds },
                attributes: ['id', 'name', 'email']
            });

            const enriched = tickets.map(t => {
                const u = users.find(u => u.id === t.userId);
                return {
                    ...t.toJSON(),
                    user: u ? { name: u.name, email: u.email } : { name: 'Unknown', email: '' }
                };
            });
            return res.json(enriched);
        }

        res.json(tickets);
    } catch (err) {
        console.error("Fetch Tickets Error:", err);
        res.status(500).json({ error: 'Server Error' });
    }
});


// GET Single Ticket
router.get('/tickets/:id', async (req, res) => {
    try {
        const ticket = await Ticket.findByPk(req.params.id);
        if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

        if (!req.user.isAdmin && ticket.userId !== req.user.id) {
            return res.status(403).json({ error: 'Access denied' });
        }

        if (req.user.isAdmin) {
            const owner = await User.findByPk(ticket.userId, { attributes: ['id', 'name', 'email'] });
            return res.json({ ...ticket.toJSON(), user: owner ? { name: owner.name, email: owner.email } : { name: 'Unknown', email: '' } });
        }

        res.json(ticket);
    } catch (err) {
        console.error('Get Ticket Error:', err);
        res.status(500).json({ error: 'Server Error' });
    }
});

// POST Create Ticket
router.post('/tickets', async (req, res) => {
    try {
        const { subject, category, priority, message } = req.body;

        // Input validation
        if (!subject || typeof subject !== 'string' || !subject.trim()) {
            return res.status(400).json({ error: 'Subject is required.' });
        }
        if (!message || typeof message !== 'string' || !message.trim()) {
            return res.status(400).json({ error: 'Message is required.' });
        }
        const validPriorities = ['Low', 'Medium', 'High', 'Critical'];
        const validCategories = ['Technical', 'Billing', 'Account', 'General'];
        if (priority && !validPriorities.includes(priority)) {
            return res.status(400).json({ error: 'Invalid priority.' });
        }
        if (category && !validCategories.includes(category)) {
            return res.status(400).json({ error: 'Invalid category.' });
        }

        const initialMessage = {
            sender: 'User',
            name: req.user.name,
            text: message.trim(),
            timestamp: new Date()
        };

        const ticket = await Ticket.create({
            userId: req.user.id,
            subject: subject.trim().substring(0, 200),
            category: validCategories.includes(category) ? category : 'General',
            priority: validPriorities.includes(priority) ? priority : 'Medium',
            messages: [initialMessage],
            lastReplyAt: new Date(),
            hasUnreadUserReply: true
        });

        // Log and notify (non-fatal)
        try { await logActivity(req, 'Ticket Created', `Ticket #${ticket.id.split('-')[0]} created: ${subject}`); } catch {}
        try {
            await AdminNotification.create({
                type: 'SUPPORT_TICKET',
                message: `New Ticket from ${req.user.name}: ${subject}`,
                data: { ticketId: ticket.id, userId: req.user.id }
            });
        } catch {}
        try {
            await sendAdminAlert('support_ticket_raised', `New support ticket from ${req.user.name}`, {
                name: req.user.name,
                subject: subject.substring(0, 100)
            });
        } catch (waErr) { console.error('[WA ALERT] support_ticket_raised failed:', waErr.message); }

        res.json(ticket);
    } catch (err) {
        console.error("Create Ticket Error:", err);
        res.status(500).json({ error: 'Server Error' });
    }
});

// POST Reply to Ticket
router.post('/tickets/:id/reply', async (req, res) => {
    const t = await Ticket.sequelize.transaction();
    try {
        const { text, status, imageUrl } = req.body;

        // Input validation — at least one of text or imageUrl is required
        const hasText = text && typeof text === 'string' && text.trim();
        const hasImage = imageUrl && typeof imageUrl === 'string' && imageUrl.length <= 2000;
        if (!hasText && !hasImage) {
            await t.rollback();
            return res.status(400).json({ error: 'Reply text or image is required.' });
        }
        const validStatuses = ['Open', 'In Progress', 'Resolved', 'Closed'];
        if (status && !validStatuses.includes(status)) {
            await t.rollback();
            return res.status(400).json({ error: 'Invalid status.' });
        }

        const ticket = await Ticket.findByPk(req.params.id, { transaction: t, lock: true });

        if (!ticket) { await t.rollback(); return res.status(404).json({ error: 'Ticket not found' }); }

        // Permission Check
        if (!req.user.isAdmin && ticket.userId !== req.user.id) {
            await t.rollback();
            return res.status(403).json({ error: 'Access denied' });
        }

        // Block replies to Closed tickets (users cannot re-open Closed)
        if (ticket.status === 'Closed' && !req.user.isAdmin) {
            await t.rollback();
            return res.status(400).json({ error: 'This ticket is closed. Please open a new ticket.' });
        }

        // Users cannot set status to Closed
        if (!req.user.isAdmin && status === 'Closed') {
            await t.rollback();
            return res.status(400).json({ error: 'Users cannot close tickets.' });
        }

        const newMessage = {
            sender: req.user.isAdmin ? 'Admin' : 'User',
            name: req.user.name,
            text: hasText ? text.trim() : '',
            timestamp: new Date(),
            ...(hasImage && { imageUrl })
        };

        const updatedMessages = [...ticket.messages, newMessage];
        ticket.messages = updatedMessages;
        ticket.lastReplyAt = new Date();

        if (req.user.isAdmin) {
            ticket.hasUnreadAdminReply = true;
            ticket.hasUnreadUserReply = false;
        } else {
            ticket.hasUnreadUserReply = true;
            ticket.hasUnreadAdminReply = false;
        }

        const previousStatus = ticket.status;
        if (status) {
            ticket.status = status;
        } else if (req.user.isAdmin && ticket.status === 'Open') {
            ticket.status = 'In Progress';
        }

        await ticket.save({ transaction: t });
        await t.commit();

        // Non-fatal notifications after commit
        if (req.user.isAdmin) {
            // Notify ticket owner when admin replies
            try {
                const owner = await User.findByPk(ticket.userId, { attributes: ['id', 'name', 'email'] });
                if (owner) {
                    await SystemNotification.create({
                        title: 'Support Ticket Update',
                        message: `Your ticket "${ticket.subject}" has received a reply from our support team.`,
                        type: 'Info',
                        recipient: owner.email,
                        target: `User: ${owner.name} (${owner.email})`,
                        buttonName: 'View Ticket',
                        buttonUrl: `/support?ticketId=${ticket.id}`,
                        status: 'Sent'
                    });
                    try { getIo().to(String(owner.id)).emit('notification_update'); } catch {}
                }
            } catch {}
        } else {
            let notifyMsg = `User Reply from ${req.user.name}: ${ticket.subject}`;
            if (status === 'Resolved' && previousStatus !== 'Resolved') {
                notifyMsg = `Ticket Resolved by ${req.user.name}: ${ticket.subject}`;
            }
            try {
                await AdminNotification.create({
                    type: 'SUPPORT_TICKET',
                    message: notifyMsg,
                    data: { ticketId: ticket.id, userId: req.user.id }
                });
            } catch {}
            try {
                await sendAdminAlert('support_ticket_replied', `User replied to ticket: ${ticket.subject}`, {
                    name: req.user.name,
                    subject: ticket.subject.substring(0, 100)
                });
            } catch (waErr) { console.error('[WA ALERT] support_ticket_replied failed:', waErr.message); }
        }

        res.json(ticket);
    } catch (err) {
        try { await t.rollback(); } catch {}
        console.error("Reply Ticket Error:", err);
        res.status(500).json({ error: 'Server Error' });
    }
});


// PATCH Update Ticket Status (without adding a message)
router.patch('/tickets/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['Open', 'In Progress', 'Resolved', 'Closed'];
        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status.' });
        }

        const ticket = await Ticket.findByPk(req.params.id);
        if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

        if (!req.user.isAdmin && ticket.userId !== req.user.id) {
            return res.status(403).json({ error: 'Access denied' });
        }
        if (!req.user.isAdmin && status === 'Closed') {
            return res.status(400).json({ error: 'Users cannot close tickets.' });
        }
        if (!req.user.isAdmin && ticket.status === 'Closed') {
            return res.status(400).json({ error: 'This ticket is closed.' });
        }

        const previousStatus = ticket.status;
        ticket.status = status;
        await ticket.save();

        // Notify superadmin when the ticket owner resolves or reopens their ticket
        if (!req.user.isAdmin && status !== previousStatus && (status === 'Resolved' || status === 'Open')) {
            try {
                await AdminNotification.create({
                    type: 'SUPPORT_TICKET',
                    message: `${status === 'Resolved' ? 'Ticket Resolved' : 'Ticket Reopened'} by ${req.user.name}: ${ticket.subject}`,
                    data: { ticketId: ticket.id, userId: req.user.id }
                });
            } catch {}
        }

        res.json(ticket);
    } catch (err) {
        console.error('Patch Status Error:', err);
        res.status(500).json({ error: 'Server Error' });
    }
});

// --- KNOWLEDGE BASE ---

// GET Articles (Public/User)
router.get('/kb', async (req, res) => {
    try {
        const isAdmin = req.user.isAdmin;
        let where = {};

        // Users only see published articles
        if (!isAdmin) {
            where.isPublished = true;
        }

        const articles = await Article.findAll({
            where,
            order: [['category', 'ASC'], ['title', 'ASC']]
        });
        res.json(articles);
    } catch (err) {
        console.error("Fetch KB Error:", err);
        res.status(500).json({ error: 'Server Error' });
    }
});

// POST Increment Article View Counter
router.post('/kb/:id/view', async (req, res) => {
    try {
        await Article.increment('views', { where: { id: req.params.id } });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Server Error' });
    }
});

// POST Create Article (Admin Only)
router.post('/kb', async (req, res) => {
    if (!req.user.isAdmin) return res.status(403).json({ error: 'Admin only' });
    try {
        const { title, content, category, isPublished } = req.body;
        if (!title || !content) return res.status(400).json({ error: 'Title and content are required.' });
        const article = await Article.create({ title, content, category, isPublished });

        // Log
        await logActivity(req, 'KB Article Created', `Admin created KB article: ${article.title}`);

        res.json(article);
    } catch (err) {
        console.error("Create KB Error:", err);
        res.status(500).json({ error: 'Server Error' });
    }
});

// PUT Update Article (Admin Only)
router.put('/kb/:id', async (req, res) => {
    if (!req.user.isAdmin) return res.status(403).json({ error: 'Admin only' });
    try {
        const article = await Article.findByPk(req.params.id);
        if (!article) return res.status(404).json({ error: 'Article not found' });

        const updates = { ...req.body };
        delete updates.id;
        delete updates.createdAt;
        delete updates.updatedAt;
        await article.update(updates);

        // Log
        await logActivity(req, 'KB Article Updated', `Admin updated KB article: ${article.title}`);

        res.json(article);
    } catch (err) {
        console.error("Update KB Error:", err);
        res.status(500).json({ error: 'Server Error' });
    }
});

// DELETE Article (Admin Only)
router.delete('/kb/:id', async (req, res) => {
    if (!req.user.isAdmin) return res.status(403).json({ error: 'Admin only' });
    try {
        const article = await Article.findByPk(req.params.id);
        if (!article) return res.status(404).json({ error: 'Article not found' });

        await article.destroy();

        // Log
        try { await logActivity(req, 'KB Article Deleted', `Admin deleted KB article: ${article.title}`); } catch {}

        res.json({ message: 'Deleted' });
    } catch (err) {
        res.status(500).json({ error: 'Server Error' });
    }
});


// --- ROADMAP ---

// GET Roadmap
router.get('/roadmap', async (req, res) => {
    try {
        const isAdmin = req.user.isAdmin;
        const items = await RoadmapItem.findAll({ order: [['date', 'ASC']] });
        const sanitized = items.map(i => {
            const obj = i.toJSON();
            if (!isAdmin) {
                // Replace voters array with a simple hasVoted boolean; hide suggester identity
                obj.hasVoted = (obj.voters || []).includes(req.user.id);
                delete obj.voters;
                delete obj.suggesterId;
            }
            return obj;
        });
        res.json(sanitized);
    } catch (err) {
        res.status(500).json({ error: 'Server Error' });
    }
});

// POST Roadmap Item (Any User can suggest)
router.post('/roadmap', async (req, res) => {
    try {
        const { title } = req.body;
        if (!title || typeof title !== 'string' || !title.trim()) {
            return res.status(400).json({ error: 'Title is required.' });
        }
        const item = await RoadmapItem.create({
            title: title.trim().substring(0, 200),
            status: 'Requested',
            suggesterId: req.user.id,
            suggesterName: req.user.name
        });

        // 🚨 WA ADMIN NOTIFICATION - FEATURE SUGGESTION
        try {
            await sendAdminAlert('feature_suggestion', `New feature suggestion from ${req.user.name}`, {
                name: req.user.name,
                suggestion: (item.title || req.body.title || 'New suggestion').substring(0, 150)
            });
        } catch (waErr) { console.error('[WA ALERT] feature_suggestion failed:', waErr.message); }

        res.json(item);
    } catch (err) {
        res.status(500).json({ error: 'Server Error' });
    }
});

// PUT Update Roadmap Item Status (Admin Only)
router.put('/roadmap/:id', async (req, res) => {
    if (!req.user.isAdmin) return res.status(403).json({ error: 'Admin only' });
    try {
        const { status } = req.body;
        const item = await RoadmapItem.findByPk(req.params.id);
        if (!item) return res.status(404).json({ error: 'Item not found' });

        const previousStatus = item.status;
        item.status = status;
        if (req.body.description !== undefined) {
            item.description = String(req.body.description).substring(0, 255);
        }
        await item.save();

        // Notify suggesting user if status changed to something positive
        if (status !== previousStatus && ['Approved', 'In Progress', 'Live'].includes(status) && item.suggesterId) {
            const suggester = await User.findByPk(item.suggesterId);
            if (suggester) {
                await SystemNotification.create({
                    title: 'Feature Suggestion Update',
                    message: `Great news! Your suggestion "${item.title}" is now ${status}.`,
                    type: 'Success',
                    recipient: suggester.email,
                    target: `User: ${suggester.name} (${suggester.email})`,
                    buttonName: 'View Roadmap',
                    buttonUrl: '/support',
                    status: 'Sent'
                });
            }
        }

        res.json(item);
    } catch (err) {
        res.status(500).json({ error: 'Server Error' });
    }
});

// DELETE Roadmap Item (Admin Only)
router.delete('/roadmap/:id', async (req, res) => {
    if (!req.user.isAdmin) return res.status(403).json({ error: 'Admin only' });
    try {
        const item = await RoadmapItem.findByPk(req.params.id);
        if (!item) return res.status(404).json({ error: 'Item not found' });
        await item.destroy();
        res.json({ message: 'Deleted' });
    } catch (err) {
        res.status(500).json({ error: 'Server Error' });
    }
});

// POST Mark roadmap as seen (Admin Only)
router.post('/roadmap/mark-seen', async (req, res) => {
    if (!req.user.isAdmin) return res.status(403).json({ error: 'Admin only' });
    try {
        const user = await User.findByPk(req.user.id);
        if (user) {
            user.lastSeenRoadmapAt = new Date();
            await user.save();
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Server Error' });
    }
});

// PUT UPVOTE (Any User)
router.post('/roadmap/:id/upvote', async (req, res) => {
    try {
        const item = await RoadmapItem.findByPk(req.params.id);
        if (item) {
            let voters = item.voters || [];
            const userId = req.user.id;

            if (voters.includes(userId)) {
                // Remove vote (undo)
                voters = voters.filter(id => id !== userId);
                item.upvotes = Math.max(0, item.upvotes - 1);
            } else {
                // Add vote
                voters = [...voters, userId];
                item.upvotes += 1;
            }

            item.voters = voters;
            await item.save();
        }
        if (!item) return res.status(404).json({ error: 'Item not found' });
        const response = item.toJSON();
        if (!req.user.isAdmin) {
            response.hasVoted = (response.voters || []).includes(req.user.id);
            delete response.voters;
            delete response.suggesterId;
        }
        res.json(response);
    } catch (err) {
        res.status(500).json({ error: 'Server Error' });
    }
});

// --- KNOWLEDGE BASE CATEGORIES ---

// GET Categories
router.get('/kb/categories', async (req, res) => {
    try {
        const categories = await KBCategory.findAll({ order: [['order', 'ASC'], ['name', 'ASC']] });
        res.json(categories);
    } catch (err) {
        res.status(500).json({ error: 'Server Error' });
    }
});

// POST Create Category (Admin Only)
router.post('/kb/categories', async (req, res) => {
    if (!req.user.isAdmin) return res.status(403).json({ error: 'Admin only' });
    try {
        const category = await KBCategory.create(req.body);

        // Log
        await logActivity(req, 'KB Category Created', `Admin created KB category: ${category.name}`);

        res.json(category);
    } catch (err) {
        res.status(500).json({ error: 'Server Error' });
    }
});

// PUT Update Category (Admin Only)
router.put('/kb/categories/:id', async (req, res) => {
    if (!req.user.isAdmin) return res.status(403).json({ error: 'Admin only' });
    try {
        const category = await KBCategory.findByPk(req.params.id);
        if (!category) return res.status(404).json({ error: 'Not found' });
        const updates = { ...req.body };
        delete updates.id;
        delete updates.createdAt;
        delete updates.updatedAt;
        if (updates.name !== undefined) {
            updates.name = String(updates.name).trim();
            if (!updates.name) return res.status(400).json({ error: 'Category name cannot be empty.' });
        }
        const oldName = category.name;
        await category.update(updates);

        // Cascade rename to articles
        if (updates.name && updates.name !== oldName) {
            await Article.update({ category: updates.name }, { where: { category: oldName } });
        }

        try { await logActivity(req, 'KB Category Updated', `Admin updated KB category: ${category.name}`); } catch {}
        res.json(category);
    } catch (err) {
        res.status(500).json({ error: 'Server Error' });
    }
});

// DELETE Category (Admin Only)
router.delete('/kb/categories/:id', async (req, res) => {
    if (!req.user.isAdmin) return res.status(403).json({ error: 'Admin only' });
    try {
        const category = await KBCategory.findByPk(req.params.id);
        if (!category) return res.status(404).json({ error: 'Category not found' });
        const name = category.name;

        // Reassign articles in this category to 'Uncategorized' before deleting
        await Article.update({ category: 'Uncategorized' }, { where: { category: name } });
        await KBCategory.destroy({ where: { id: req.params.id } });

        try { await logActivity(req, 'KB Category Deleted', `Admin deleted KB category: ${name}`); } catch {}
        res.json({ message: 'Deleted' });
    } catch (err) {
        res.status(500).json({ error: 'Server Error' });
    }
});

// POST Upload Image (Admin Only)
const storageProvider = require('../utils/storageProvider');

router.post('/kb/upload-image',
    (req, res, next) => {
        if (!req.user.isAdmin) return res.status(403).json({ error: 'Admin only' });
        next();
    },
    storageProvider('kb', { fileFilter: storageProvider.generalImageFilter }).single('image'),
    async (req, res) => {
        if (!req.file) return res.status(400).json({ error: 'No file' });
        res.json({ url: req.file.publicUrl });
    }
);

// POST Upload image attachment for a ticket reply (jpeg/png only, 10MB max)
router.post('/tickets/:id/upload-image',
    storageProvider('support-attachments', {
        fileFilter: storageProvider.generalImageFilter,
        uniqueNames: true,
        limits: { fileSize: 10 * 1024 * 1024 }
    }).single('image'),
    async (req, res) => {
        try {
            if (!req.file) return res.status(400).json({ error: 'No image uploaded.' });
            const ticket = await Ticket.findByPk(req.params.id, { attributes: ['id', 'userId'] });
            if (!ticket) return res.status(404).json({ error: 'Ticket not found.' });
            if (!req.user.isAdmin && ticket.userId !== req.user.id) {
                return res.status(403).json({ error: 'Access denied.' });
            }
            res.json({ url: req.file.publicUrl });
        } catch (e) {
            res.status(500).json({ error: 'Upload failed.' });
        }
    }
);

module.exports = router;
