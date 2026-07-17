const express = require('express');
const router = express.Router();
const ContactMessage = require('../models/ContactMessage');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const AdminNotification = require('../models/AdminNotification');
const verifyTurnstile = require('../middleware/turnstile');
const { sendAdminAlert } = require('../services/systemMessenger');

// POST /api/contact - Public endpoint to submit a message
router.post('/', verifyTurnstile, async (req, res) => {
    try {
        const { name, email, countryCode, phone, message } = req.body;
        
        if (!name || !email || !countryCode || !phone || !message) {
            return res.status(400).json({ error: 'Please provide all required fields' });
        }

        const newMsg = await ContactMessage.create({
            name,
            email,
            countryCode,
            phone,
            message
        });

        // Notify admins
        await AdminNotification.create({
            type: 'SUPPORT_TICKET',
            message: `New message from ${name} (${email})`,
            data: { contactId: newMsg.id }
        });

        // 🚨 WA ADMIN NOTIFICATION - CONTACT INQUIRY
        try {
            await sendAdminAlert('contact_inquiry', `New contact inquiry from ${name}`, {
                name,
                message: message.substring(0, 200) // Truncate for template safety
            });
        } catch (waErr) { console.error('[WA ALERT] contact_inquiry failed:', waErr.message); }

        res.status(201).json({ success: true, message: 'Message sent successfully!' });
    } catch (err) {
        console.error('Contact Submit Error:', err);
        res.status(500).json({ error: 'Server error while sending message' });
    }
});

// GET /api/contact/unread-count - Admin endpoint to get unread message count
router.get('/unread-count', [auth, admin], async (req, res) => {
    try {
        const count = await ContactMessage.count({ where: { status: 'unread' } });
        res.json({ count });
    } catch (err) {
        console.error('Fetch Unread Contacts Error:', err);
        res.status(500).json({ error: 'Server error fetching count' });
    }
});

// GET /api/contact - Admin endpoint to list all messages
router.get('/', [auth, admin], async (req, res) => {
    try {
        const messages = await ContactMessage.findAll({
            order: [['createdAt', 'DESC']]
        });
        res.json(messages);
    } catch (err) {
        console.error('Fetch Contacts Error:', err);
        res.status(500).json({ error: 'Server error fetching messages' });
    }
});

// PUT /api/contact/:id - Admin endpoint to mark a message as read or unread
router.put('/:id', [auth, admin], async (req, res) => {
    try {
        const msgId = req.params.id;
        const { status } = req.body;

        const msg = await ContactMessage.findByPk(msgId);
        if (!msg) {
            return res.status(404).json({ error: 'Message not found' });
        }

        if (status) {
            msg.status = status;
            await msg.save();
        }

        res.json(msg);
    } catch (err) {
        console.error('Update Contact Error:', err);
        res.status(500).json({ error: 'Server error updating message' });
    }
});

// DELETE /api/contact/:id - Admin endpoint to delete a message
router.delete('/:id', [auth, admin], async (req, res) => {
    try {
        const msgId = req.params.id;
        const msg = await ContactMessage.findByPk(msgId);
        
        if (!msg) {
            return res.status(404).json({ error: 'Message not found' });
        }

        await msg.destroy();
        res.json({ success: true, message: 'Message deleted' });
    } catch (err) {
        console.error('Delete Contact Error:', err);
        res.status(500).json({ error: 'Server error deleting message' });
    }
});

module.exports = router;
