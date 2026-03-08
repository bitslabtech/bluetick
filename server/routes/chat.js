const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const Conversation = require('../models/Conversation');
const ChatMessage = require('../models/ChatMessage');
const Settings = require('../models/Settings');
const Template = require('../models/Template');
const auth = require('../middleware/auth');
const logActivity = require('../utils/logger');
const { getUserPlanLimits, checkLimit, getMonthlyMessageCount } = require('../utils/planLimits');

router.use(auth);

// Helper: Send to Meta API
const sendToMeta = async (settings, payload) => {
    const res = await fetch(`https://graph.facebook.com/v17.0/${settings.metaPhoneNumberId}/messages`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${settings.metaAccessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) {
        throw new Error(data.error?.message || 'Meta API Error');
    }
    return data;
};

// GET /conversations - List of chats
router.get('/conversations', async (req, res) => {
    try {
        console.log(`[CHAT API] GET /conversations for userId: ${req.user.id}`);
        const conversations = await Conversation.findAll({
            where: { userId: req.user.id },
            order: [['lastMessageAt', 'DESC']]
        });
        console.log(`[CHAT API] Found ${conversations.length} conversations for user ${req.user.id}`);
        res.json(conversations);
    } catch (err) {
        console.error('[CHAT API] Error fetching conversations:', err);
        res.status(500).json({ error: 'Server Error' });
    }
});

// GET /conversations/:id/messages - Message history
router.get('/conversations/:id/messages', async (req, res) => {
    try {
        console.log(`[CHAT API] GET /conversations/${req.params.id}/messages`);
        const messages = await ChatMessage.findAll({
            where: { conversationId: req.params.id },
            order: [['timestamp', 'ASC']]
        });
        console.log(`[CHAT API] Found ${messages.length} messages for conversation ${req.params.id}`);
        res.json(messages);
    } catch (err) {
        console.error('[CHAT API] Error fetching messages:', err);
        res.status(500).json({ error: 'Server Error' });
    }
});

// POST /send/text - Send text message (Enforces 24h Rule)
router.post('/send/text', async (req, res) => {
    try {
        const { conversationId, body } = req.body;
        const userId = req.user.id;
        console.log(`[CHAT API] POST /send/text | userId: ${userId} | conversationId: ${conversationId} | body: ${body}`);

        // Check monthly message limit (dynamic — reads from Plan in DB)
        const limits = await getUserPlanLimits(userId);
        const sentThisMonth = await getMonthlyMessageCount(userId);
        const msgCheck = checkLimit(sentThisMonth, limits.messageLimit);
        if (!msgCheck.allowed) {
            return res.status(429).json({
                error: `Monthly message limit reached (${msgCheck.used}/${msgCheck.limit}). Upgrade your plan to send more messages.`,
                code: 'LIMIT_REACHED',
                sentThisMonth: msgCheck.used,
                monthlyLimit: msgCheck.limit
            });
        }

        const conversation = await Conversation.findOne({ where: { id: conversationId, userId } });
        if (!conversation) return res.status(404).json({ error: 'Conversation not found' });

        // 1. Check 24h Window
        const lastInbound = conversation.lastInboundMessageAt ? new Date(conversation.lastInboundMessageAt).getTime() : 0;
        const now = Date.now();
        const diffHours = (now - lastInbound) / (1000 * 60 * 60);

        // Allow if < 24 hours OR if it's the very first message initiated by user (wait context?)
        // Actually, if lastInbound is 0/null, it means we NEVER received a message, so we definitely can't send text (unless we initiated, but Meta requires user consent/template for business initiated).
        // Since we are strictly "business initiated requires template", we assume:
        // Text is ONLY allowed if window is open.

        if (!conversation.lastInboundMessageAt || diffHours > 24) {
            return res.status(400).json({
                error: '24-hour service window expired. Please send a template message to reopen the conversation.',
                code: 'WINDOW_EXPIRED'
            });
        }

        // 2. Get Settings
        const settings = await Settings.findOne({ where: { userId } });
        if (!settings?.metaAccessToken) return res.status(403).json({ error: 'WhatsApp not configured' });

        // 3. Send to Meta
        const payload = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: conversation.phoneNumber,
            type: "text",
            text: { preview_url: false, body }
        };

        const metaRes = await sendToMeta(settings, payload);

        // 4. Save to DB
        const msg = await ChatMessage.create({
            conversationId: conversation.id,
            messageId: metaRes.messages?.[0]?.id,
            direction: 'OUTBOUND',
            type: 'text',
            body,
            status: 'sent',
            timestamp: new Date()
        });

        // 5. Update Conversation
        conversation.lastMessage = body;
        conversation.lastMessageAt = new Date();
        await conversation.save();

        res.json(msg);

    } catch (err) {
        console.error("Send Text Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// POST /send/template - Send template message (Bypasses 24h check)
router.post('/send/template', async (req, res) => {
    try {
        const { conversationId, templateName, languageCode, components, templateId } = req.body;
        const userId = req.user.id;

        // Check monthly message limit (dynamic — reads from Plan in DB)
        const limits = await getUserPlanLimits(userId);
        const sentThisMonth = await getMonthlyMessageCount(userId);
        const msgCheck = checkLimit(sentThisMonth, limits.messageLimit);
        if (!msgCheck.allowed) {
            return res.status(429).json({
                error: `Monthly message limit reached (${msgCheck.used}/${msgCheck.limit}). Upgrade your plan to send more messages.`,
                code: 'LIMIT_REACHED',
                sentThisMonth: msgCheck.used,
                monthlyLimit: msgCheck.limit
            });
        }

        const conversation = await Conversation.findOne({ where: { id: conversationId, userId } });
        if (!conversation) return res.status(404).json({ error: 'Conversation not found' });

        const settings = await Settings.findOne({ where: { userId } });
        if (!settings?.metaAccessToken) return res.status(403).json({ error: 'WhatsApp not configured' });

        const payload = {
            messaging_product: "whatsapp",
            to: conversation.phoneNumber,
            type: "template",
            template: {
                name: templateName,
                language: { code: languageCode || 'en_US' },
                components: components || []
            }
        };

        const metaRes = await sendToMeta(settings, payload);

        // Build rich renderer-friendly templateData from the template DB record
        let richTemplateComponents = [];
        try {
            // Try to look up by templateId or by name+userId
            const template = templateId
                ? await Template.findOne({ where: { id: templateId, userId } })
                : await Template.findOne({ where: { name: templateName, userId } });

            if (template) {
                if (template.archetype === 'carousel' && Array.isArray(template.cards) && template.cards.length > 0) {
                    if (template.content) {
                        richTemplateComponents.push({ type: 'BODY', text: template.content });
                    }
                    richTemplateComponents.push({
                        type: 'CAROUSEL',
                        cards: template.cards.map((card) => {
                            const cardComps = [];
                            if (card.headerType && card.headerType !== 'NONE') {
                                cardComps.push({ type: 'HEADER', format: card.headerType });
                            }
                            if (card.content) cardComps.push({ type: 'BODY', text: card.content });
                            if (card.buttons && card.buttons.length > 0) {
                                cardComps.push({ type: 'BUTTONS', buttons: card.buttons });
                            }
                            return { components: cardComps };
                        })
                    });
                } else {
                    if (template.content) richTemplateComponents.push({ type: 'BODY', text: template.content });
                    if (template.buttons && template.buttons.length > 0) {
                        richTemplateComponents.push({ type: 'BUTTONS', buttons: template.buttons });
                    }
                }
            } else {
                // Fallback: store whatever components were passed
                richTemplateComponents = components || [];
            }
        } catch (lookupErr) {
            console.error('[CHAT] Template lookup for rich templateData failed:', lookupErr.message);
            richTemplateComponents = components || [];
        }

        await ChatMessage.create({
            conversationId: conversation.id,
            messageId: metaRes.messages?.[0]?.id,
            direction: 'OUTBOUND',
            type: 'template',
            body: `Template: ${templateName}`,
            templateData: {
                name: templateName,
                language: languageCode || 'en_US',
                components: richTemplateComponents
            },
            status: 'sent',
            timestamp: new Date()
        });

        conversation.lastMessage = `Template: ${templateName}`;
        conversation.lastMessageAt = new Date();
        await conversation.save();

        res.json({ success: true });

    } catch (err) {
        console.error("Send Template Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// POST /read - Mark messages as read
router.post('/conversations/:id/read', async (req, res) => {
    try {
        const conversation = await Conversation.findOne({ where: { id: req.params.id, userId: req.user.id } });
        if (conversation) {
            conversation.unreadCount = 0;
            await conversation.save();
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PATCH /conversations/:id/labels - Update labels
router.patch('/conversations/:id/labels', async (req, res) => {
    try {
        const conversation = await Conversation.findOne({ where: { id: req.params.id, userId: req.user.id } });
        if (!conversation) return res.status(404).json({ error: 'Not found' });
        conversation.labels = req.body.labels || [];
        await conversation.save();
        res.json({ success: true, labels: conversation.labels });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PATCH /conversations/:id/notes - Update notes
router.patch('/conversations/:id/notes', async (req, res) => {
    try {
        const conversation = await Conversation.findOne({ where: { id: req.params.id, userId: req.user.id } });
        if (!conversation) return res.status(404).json({ error: 'Not found' });
        conversation.notes = req.body.notes ?? conversation.notes;
        conversation.assignedTo = req.body.assignedTo ?? conversation.assignedTo;
        await conversation.save();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /quick-replies - List all quick replies for user
router.get('/quick-replies', async (req, res) => {
    try {
        const QuickReply = require('../models/QuickReply');
        const replies = await QuickReply.findAll({
            where: { userId: req.user.id },
            order: [['shortcut', 'ASC']]
        });
        res.json(replies);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /quick-replies - Create a quick reply
router.post('/quick-replies', async (req, res) => {
    try {
        const QuickReply = require('../models/QuickReply');
        const { shortcut, message } = req.body;
        if (!shortcut || !message) return res.status(400).json({ error: 'shortcut and message are required' });
        const reply = await QuickReply.create({ shortcut: shortcut.toLowerCase(), message, userId: req.user.id });
        res.json(reply);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /quick-replies/:id - Delete a quick reply
router.delete('/quick-replies/:id', async (req, res) => {
    try {
        const QuickReply = require('../models/QuickReply');
        await QuickReply.destroy({ where: { id: req.params.id, userId: req.user.id } });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /send/media - Send image or document via Meta API
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir)
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        cb(null, uniqueSuffix + path.extname(file.originalname))
    }
});
const upload = multer({ storage: storage });

router.post('/send/media', upload.single('file'), async (req, res) => {
    try {
        const { conversationId, mediaType, caption } = req.body;
        const file = req.file;
        const userId = req.user.id;

        if (!file) return res.status(400).json({ error: 'No file uploaded' });

        const conversation = await Conversation.findOne({ where: { id: conversationId, userId } });
        if (!conversation) return res.status(404).json({ error: 'Conversation not found' });

        const lastInbound = conversation.lastInboundMessageAt ? new Date(conversation.lastInboundMessageAt).getTime() : 0;
        if (!lastInbound || (Date.now() - lastInbound) / (1000 * 60 * 60) > 24) {
            return res.status(400).json({ error: '24-hour window expired. Send a template message first.', code: 'WINDOW_EXPIRED' });
        }

        const settings = await Settings.findOne({ where: { userId } });
        if (!settings?.metaAccessToken) return res.status(403).json({ error: 'WhatsApp not configured' });

        // IMPORTANT: We need a publicly accessible URL for Meta to download the file.
        // It uses the incoming request host to construct the URL. If behind a proxy, rely on x-forwarded-proto/host.
        // Since the user is using cloudflared, req.get('host') is the cloudflare domain.
        const protocol = req.headers['x-forwarded-proto'] || req.protocol;
        const host = req.headers['x-forwarded-host'] || req.get('host');
        const publicUrl = `${protocol}://${host}/uploads/${file.filename}`;

        console.log(`[CHAT API] Uploaded media available at: ${publicUrl}`);

        // Build Meta payload based on media type
        let payload;
        if (mediaType === 'image') {
            payload = {
                messaging_product: 'whatsapp', recipient_type: 'individual',
                to: conversation.phoneNumber, type: 'image',
                image: { link: publicUrl, caption: caption || '' }
            };
        } else if (mediaType === 'document') {
            payload = {
                messaging_product: 'whatsapp', recipient_type: 'individual',
                to: conversation.phoneNumber, type: 'document',
                document: { link: publicUrl, caption: caption || '', filename: file.originalname }
            };
        } else {
            return res.status(400).json({ error: 'Unsupported mediaType. Use image or document.' });
        }

        const metaRes = await sendToMeta(settings, payload);

        const msg = await ChatMessage.create({
            conversationId: conversation.id,
            messageId: metaRes.messages?.[0]?.id,
            direction: 'OUTBOUND',
            type: mediaType,
            body: caption || file.originalname || mediaType,
            mediaUrl: publicUrl,
            status: 'sent',
            timestamp: new Date()
        });

        conversation.lastMessage = `📎 ${caption || file.originalname || mediaType}`;
        conversation.lastMessageAt = new Date();
        await conversation.save();

        res.json(msg);
    } catch (err) {
        console.error('Send Media Error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

