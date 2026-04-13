const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const AdminNotification = require('../models/AdminNotification');
const Ticket = require('../models/Ticket');
const Article = require('../models/Article');
const RoadmapItem = require('../models/RoadmapItem');
const User = require('../models/User');
const auth = require('../middleware/auth');
const logActivity = require('../utils/logger');
const KBCategory = require('../models/KBCategory');
// Multer Setup for KB Images replaced by storageProvider

// Middleware: Verify Auth
router.use(auth);

// --- TICKETS ---

// GET My Tickets (User) or All Tickets (Admin)
router.get('/tickets', async (req, res) => {
    try {
        const isAdmin = req.user.isAdmin;
        let where = {};

        // If User, restrict to own tickets
        if (!isAdmin) {
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

// POST Create Ticket
router.post('/tickets', async (req, res) => {
    try {
        const { subject, category, priority, message } = req.body;

        const initialMessage = {
            sender: 'User',
            name: req.user.name,
            text: message,
            timestamp: new Date()
        };

        const ticket = await Ticket.create({
            userId: req.user.id,
            subject,
            category,
            priority,
            messages: [initialMessage],
            lastReplyAt: new Date()
        });

        // Log
        await logActivity(req, 'Ticket Created', `Ticket #${ticket.id.split('-')[0]} created: ${subject}`);

        // Notify Admin
        await AdminNotification.create({
            type: 'SUPPORT_TICKET',
            message: `New Ticket from ${req.user.name}: ${subject}`,
            data: { ticketId: ticket.id, userId: req.user.id }
        });

        res.json(ticket);
    } catch (err) {
        console.error("Create Ticket Error:", err);
        res.status(500).json({ error: 'Server Error' });
    }
});

// POST Reply to Ticket
router.post('/tickets/:id/reply', async (req, res) => {
    try {
        const { text, status } = req.body;
        const ticket = await Ticket.findByPk(req.params.id);

        if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

        // Permission Check
        if (!req.user.isAdmin && ticket.userId !== req.user.id) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const newMessage = {
            sender: req.user.isAdmin ? 'Admin' : 'User',
            name: req.user.name, // Assuming name is in token/user object
            text,
            timestamp: new Date()
        };

        // Append Message
        // Sequelize JSON array append workaround or just spread
        const updatedMessages = [...ticket.messages, newMessage];
        ticket.messages = updatedMessages;
        ticket.lastReplyAt = new Date();

        // Check previous status vs new status
        const previousStatus = ticket.status;

        // Update Status if provided (mostly for Admin, but User can resolve/reopen)
        if (status) ticket.status = status;

        await ticket.save();

        // Notify Admin if User replied or changed status
        if (!req.user.isAdmin) {
            let notifyMsg = `User Reply from ${req.user.name}: ${ticket.subject}`;

            if (status === 'Resolved' && previousStatus !== 'Resolved') {
                notifyMsg = `Ticket Resolved by ${req.user.name}: ${ticket.subject}`;
            } else if (status === 'Open' && previousStatus === 'Resolved') {
                notifyMsg = `Ticket Reopened by ${req.user.name}: ${ticket.subject}`;
            }

            await AdminNotification.create({
                type: 'SUPPORT_TICKET',
                message: notifyMsg,
                data: { ticketId: ticket.id, userId: req.user.id }
            });
        }

        res.json(ticket);
    } catch (err) {
        console.error("Reply Ticket Error:", err);
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

// POST Create Article (Admin Only)
router.post('/kb', async (req, res) => {
    if (!req.user.isAdmin) return res.status(403).json({ error: 'Admin only' });
    try {
        const article = await Article.create(req.body);

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

        await article.update(req.body);

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
        const title = article ? article.title : req.params.id;

        await Article.destroy({ where: { id: req.params.id } });

        // Log
        await logActivity(req, 'KB Article Deleted', `Admin deleted KB article: ${title}`);

        res.json({ message: 'Deleted' });
    } catch (err) {
        res.status(500).json({ error: 'Server Error' });
    }
});


// --- ROADMAP ---

// GET Roadmap
router.get('/roadmap', async (req, res) => {
    try {
        const items = await RoadmapItem.findAll({
            order: [['date', 'ASC']]
        });
        res.json(items);
    } catch (err) {
        res.status(500).json({ error: 'Server Error' });
    }
});

// POST Roadmap Item (Any User can suggest)
router.post('/roadmap', async (req, res) => {
    try {
        const item = await RoadmapItem.create({
            ...req.body,
            status: 'Requested', // Force status to 'Requested' for user suggestions
            suggesterId: req.user.id,
            suggesterName: req.user.name
        });
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

        item.status = status;
        await item.save();
        res.json(item);
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
        res.json(item);
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
        await category.update(req.body);

        // Log
        await logActivity(req, 'KB Category Updated', `Admin updated KB category: ${category.name}`);

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
        const name = category ? category.name : req.params.id;

        await KBCategory.destroy({ where: { id: req.params.id } });

        // Log
        await logActivity(req, 'KB Category Deleted', `Admin deleted KB category: ${name}`);

        res.json({ message: 'Deleted' });
    } catch (err) {
        res.status(500).json({ error: 'Server Error' });
    }
});

// POST Upload Image (Admin Only)
const storageProvider = require('../utils/storageProvider');

router.post('/kb/upload-image', storageProvider('kb').single('image'), async (req, res) => {
    if (!req.user.isAdmin) return res.status(403).json({ error: 'Admin only' });
    if (!req.file) return res.status(400).json({ error: 'No file' });

    res.json({ url: req.file.publicUrl });
});

module.exports = router;
