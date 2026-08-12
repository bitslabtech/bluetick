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

// POST /api/contact/demo - Public endpoint for Book Demo Modal
router.post('/demo', async (req, res) => {
    try {
        const { name, countryCode, phone, triggerTemplate } = req.body;
        
        if (!name || !phone) {
            return res.status(400).json({ error: 'Please provide name and phone' });
        }

        const fullPhone = `${countryCode || '91'}${phone}`.replace(/\D/g, '');

        const SystemConfig = require('../models/SystemConfig');
        const Contact = require('../models/Contact');
        const LandingPage = require('../models/LandingPage');
        
        const config = await SystemConfig.getConfig();
        const landingSettings = await LandingPage.getSettings();
        
        const linkedAdminUserId = config?.settings?.linkedAdminUserId;
        const bookDemoConfig = landingSettings.bookDemo || {};

        const parseTags = (input) => {
            if (!input) return [];
            if (Array.isArray(input)) return input.map(t => typeof t === 'object' ? (t.value || t.name) : t.toString());
            if (typeof input === 'string') return input.split(',').map(t => t.trim()).filter(Boolean);
            return [];
        };

        if (linkedAdminUserId) {
            let primaryOwnerId = linkedAdminUserId;
            if (bookDemoConfig.crmOwners && bookDemoConfig.crmOwners.length > 0) {
                primaryOwnerId = bookDemoConfig.crmOwners[0];
            }

            const customTags = [
                ...parseTags(bookDemoConfig.crmTags),
                ...parseTags(bookDemoConfig.crmGroups)
            ];

            // 1. Instantly validate by sending the template if configured
            if (triggerTemplate) {
                try {
                    const Template = require('../models/Template');
                    const { sendSystemMessage } = require('../services/systemMessenger');
                    
                    const template = await Template.findOne({ where: { userId: linkedAdminUserId, name: triggerTemplate } });
                    if (template) {
                        const result = await sendSystemMessage(fullPhone, 'template', {
                            templateName: template.name,
                            languageCode: template.language || 'en',
                            components: []
                        });
                        
                        // If the message fails to send (e.g. invalid number), block the submission
                        if (!result || !result.success) {
                            // Check if the error is specifically about the number being invalid
                            const errCode = result?.error?.error?.code;
                            
                            // 131026: Message Undeliverable (not on WA / blocked)
                            // 131009: Parameter invalid (bad phone format)
                            // 133010: Phone number not registered
                            if (errCode === 131026 || errCode === 131009 || errCode === 133010) {
                                return res.status(400).json({ error: 'Please enter a valid WhatsApp number.' });
                            }
                            
                            // For other errors (e.g. 131048 Healthy Ecosystem, Rate Limits, or Payment issues),
                            // we DO NOT block the user. We log the issue and gracefully continue to save the lead!
                            console.warn('[Demo Route] Template send skipped (Non-fatal error):', errCode || result?.error);
                        }
                    }
                } catch (tempErr) {
                    console.error('Demo trigger template error:', tempErr);
                    return res.status(400).json({ error: 'Please enter a valid WhatsApp number.' });
                }
            }

            // 2. Since validation passed (or wasn't configured), find or create contact
            let contact = await Contact.findOne({ where: { userId: primaryOwnerId, phone: fullPhone } });
            
            if (contact) {
                // Ensure tags exist
                let currentTags = contact.tags || [];
                contact.tags = [...new Set([...currentTags, 'demo request', ...customTags])];
                if (contact.name === 'AI Chatbot Lead') contact.name = name;
                await contact.save();
            } else {
                contact = await Contact.create({
                    userId: primaryOwnerId,
                    name,
                    phone: fullPhone,
                    tags: [...new Set(['demo request', ...customTags])],
                    createdById: primaryOwnerId
                });
            }

            // 3. Notify admin
            await AdminNotification.create({
                type: 'SYSTEM_ALERT',
                message: `New demo request from ${name} (${fullPhone})`,
            });
            try {
                await sendAdminAlert('contact_inquiry', `New Demo Request from ${name} (${fullPhone})`, { name, message: 'Demo Request' });
            } catch (e) {}
        }

        res.status(201).json({ success: true, message: 'Demo request received!' });
    } catch (err) {
        console.error('Demo Submit Error:', err);
        res.status(500).json({ error: 'Server error while processing demo request' });
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
