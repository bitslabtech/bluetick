const express = require('express');
const router = express.Router();
const apiAuth = require('../middleware/apiAuth');
const apiRateLimiter = require('../middleware/apiRateLimiter');
const { Op } = require('sequelize');

// Models
const Contact = require('../models/Contact');
const Template = require('../models/Template');
const Conversation = require('../models/Conversation');
const ChatMessage = require('../models/ChatMessage');
const Settings = require('../models/Settings');
const ApiUsageLog = require('../models/ApiUsageLog');

// Utilities
const { getUserPlanLimits, checkLimit, getMonthlyMessageCount, getContactCount } = require('../utils/planLimits');

// ==========================================
// MIDDLEWARE CHAIN: Auth → Rate Limit → Log
// ==========================================

// 1. Authenticate every /v1/* request
router.use(apiAuth);

// 2. Per-key rate limiter (runs AFTER apiAuth sets req.apiKey)
router.use(apiRateLimiter);

// 3. Usage logging middleware — records every response to ApiUsageLog
router.use((req, res, next) => {
    const startTime = Date.now();

    // Intercept res.json to capture what we're sending back
    const originalJson = res.json.bind(res);
    res.json = (body) => {
        // Log asynchronously — don't block the response
        setImmediate(async () => {
            try {
                const userId = req.user?.id;
                if (!userId) return; // Skip if auth failed before this

                const statusCode = res.statusCode;
                const responseTimeMs = Date.now() - startTime;

                // Mask phone for privacy (only last 4 digits)
                const rawPhone = req.body?.to || req.body?.recipients?.[0] || null;
                const recipientPhone = rawPhone ? String(rawPhone).slice(-4).padStart(String(rawPhone).length, '*') : null;

                await ApiUsageLog.create({
                    userId,
                    apiKeyId: req.apiKey?.id || null,
                    method: req.method,
                    endpoint: `${req.method} /v1${req.path}`,
                    statusCode,
                    responseTimeMs,
                    recipientPhone,
                    templateName: req.body?.templateName || null,
                    metaMessageId: body?.messageId || null,
                    errorCode: body?.code || (statusCode >= 400 ? 'HTTP_ERROR' : null),
                    errorMessage: statusCode >= 400 ? (body?.error || null) : null,
                    ipAddress: req.ip || req.connection?.remoteAddress,
                    userAgent: req.headers['user-agent']?.slice(0, 512) || null
                });
            } catch (logErr) {
                console.error('[apiV1] Usage log error:', logErr.message);
            }
        });

        return originalJson(body);
    };

    next();
});

// ==========================================
// Helper: Send to Meta API
// ==========================================
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

// ==========================================
// HEALTH CHECK
// ==========================================

/**
 * GET /v1/ping
 * Lets client verify their API key is valid, subscription active, and see current usage.
 * Use this as a "test connection" endpoint.
 */
router.get('/ping', async (req, res) => {
    try {
        const ownerId = req.user.id;
        const limits = await getUserPlanLimits(ownerId);
        const sentThisMonth = await getMonthlyMessageCount(ownerId);

        res.json({
            status: 'ok',
            platform: 'WhatsApp Gateway',
            plan: limits.planName,
            usage: {
                messagesUsed: sentThisMonth,
                messagesLimit: limits.messageLimit === -1 ? 'unlimited' : limits.messageLimit,
                messagesRemaining: limits.messageLimit === -1 ? 'unlimited' : Math.max(0, limits.messageLimit - sentThisMonth)
            },
            keyScopes: req.apiKey?.scopes || [],
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        res.status(500).json({ error: 'Server Error', details: err.message });
    }
});

// ==========================================
// USAGE ANALYTICS
// ==========================================

/**
 * GET /v1/usage
 * Returns the client's own API usage statistics and recent call history.
 */
router.get('/usage', async (req, res) => {
    try {
        const userId = req.user.id;
        const apiKeyId = req.apiKey?.id;

        // Date ranges
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        // Current plan limits
        const limits = await getUserPlanLimits(userId);
        const sentThisMonth = await getMonthlyMessageCount(userId);

        // Usage logs for this key
        const [totalCalls, successCalls, errorCalls, recentCalls, dailyBreakdown] = await Promise.all([
            // Total this month
            ApiUsageLog.count({ where: { userId, createdAt: { [Op.gte]: startOfMonth } } }),
            // Successful this month
            ApiUsageLog.count({ where: { userId, statusCode: { [Op.between]: [200, 299] }, createdAt: { [Op.gte]: startOfMonth } } }),
            // Failed this month
            ApiUsageLog.count({ where: { userId, statusCode: { [Op.gte]: 400 }, createdAt: { [Op.gte]: startOfMonth } } }),
            // Last 20 calls
            ApiUsageLog.findAll({
                where: { userId },
                order: [['createdAt', 'DESC']],
                limit: 20,
                attributes: ['id', 'method', 'endpoint', 'statusCode', 'responseTimeMs', 'templateName', 'recipientPhone', 'errorMessage', 'createdAt']
            }),
            // Daily call breakdown for the last 30 days
            ApiUsageLog.findAll({
                where: { userId, createdAt: { [Op.gte]: thirtyDaysAgo } },
                attributes: [
                    [require('../config/database').sequelize.fn('DATE', require('../config/database').sequelize.col('createdAt')), 'date'],
                    [require('../config/database').sequelize.fn('COUNT', '*'), 'calls'],
                    [require('../config/database').sequelize.fn('SUM', require('../config/database').sequelize.literal("CASE WHEN status_code >= 400 THEN 1 ELSE 0 END")), 'errors']
                ],
                group: [require('../config/database').sequelize.fn('DATE', require('../config/database').sequelize.col('createdAt'))],
                order: [[require('../config/database').sequelize.fn('DATE', require('../config/database').sequelize.col('createdAt')), 'ASC']]
            })
        ]);

        res.json({
            plan: {
                name: limits.planName,
                messageLimit: limits.messageLimit === -1 ? 'unlimited' : limits.messageLimit,
                messagesUsedThisMonth: sentThisMonth,
                messagesRemaining: limits.messageLimit === -1 ? 'unlimited' : Math.max(0, limits.messageLimit - sentThisMonth)
            },
            apiCalls: {
                totalThisMonth: totalCalls,
                successThisMonth: successCalls,
                errorsThisMonth: errorCalls,
                successRate: totalCalls > 0 ? `${Math.round((successCalls / totalCalls) * 100)}%` : 'N/A'
            },
            recentCalls,
            dailyBreakdown
        });
    } catch (err) {
        console.error('[/v1/usage] Error:', err);
        res.status(500).json({ error: 'Server Error', details: err.message });
    }
});

// ==========================================
// CONTACTS API
// ==========================================

// GET /v1/contacts - Fetch contacts for the authenticated user
router.get('/contacts', async (req, res) => {
    try {
        const { limit = 50, offset = 0 } = req.query;
        const contacts = await Contact.findAll({
            where: { userId: req.user.id },
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset),
            attributes: ['id', 'name', 'phone', 'email', 'tags', 'createdAt']
        });
        
        const total = await Contact.count({ where: { userId: req.user.id } });

        res.json({
            data: contacts,
            meta: { total, limit: parseInt(limit), offset: parseInt(offset) }
        });
    } catch (err) {
        res.status(500).json({ error: 'Server Error', details: err.message });
    }
});

// POST /v1/contacts - Create/Import a new contact
router.post('/contacts', async (req, res) => {
    try {
        const { name, phone, email, tags } = req.body;
        if (!name || !phone) return res.status(400).json({ error: 'Name and phone are required.' });

        const limits = await getUserPlanLimits(req.user.id);
        const currentCount = await getContactCount(req.user.id);

        if (limits.contactLimit !== -1 && currentCount >= limits.contactLimit) {
            return res.status(429).json({ error: 'Contact limit reached for your plan.' });
        }

        const cleanPhone = String(phone).replace(/\D/g, '');
        const existing = await Contact.findOne({ where: { phone: cleanPhone, userId: req.user.id } });
        
        if (existing) {
            return res.status(409).json({ error: 'Contact with this phone number already exists.' });
        }

        const newContact = await Contact.create({
            name,
            phone: cleanPhone,
            email,
            tags: tags || [],
            userId: req.user.id,
            createdById: req.user.realId || req.user.id
        });

        res.status(201).json({ success: true, contact: newContact });
    } catch (err) {
        res.status(500).json({ error: 'Server Error', details: err.message });
    }
});

// ==========================================
// TEMPLATES API
// ==========================================

// GET /v1/templates - Fetch approved WABA templates
router.get('/templates', async (req, res) => {
    try {
        const templates = await Template.findAll({
            where: { userId: req.user.id, status: 'APPROVED' },
            attributes: ['id', 'name', 'language', 'category', 'content', 'createdAt']
        });
        res.json({ data: templates });
    } catch (err) {
        res.status(500).json({ error: 'Server Error', details: err.message });
    }
});

// ==========================================
// MESSAGES API
// ==========================================

// Internal helper: check message limits and load settings
const getOwnerContext = async (ownerId) => {
    const limits = await getUserPlanLimits(ownerId);
    const sentThisMonth = await getMonthlyMessageCount(ownerId);
    const msgCheck = checkLimit(sentThisMonth, limits.messageLimit);
    const settings = await Settings.findOne({ where: { userId: ownerId } });
    return { limits, sentThisMonth, msgCheck, settings };
};

// Internal helper: find or create a conversation for a phone number
const findOrCreateConversation = async (ownerId, cleanPhone) => {
    let conversation = await Conversation.findOne({ where: { phoneNumber: cleanPhone, userId: ownerId } });
    if (!conversation) {
        const contact = await Contact.findOne({ where: { phone: cleanPhone, userId: ownerId } });
        conversation = await Conversation.create({
            userId: ownerId,
            phoneNumber: cleanPhone,
            contactName: contact ? contact.name : cleanPhone,
            status: 'open',
            unreadCount: 0
        });
    }
    return conversation;
};

/**
 * POST /v1/messages/template
 * Send a pre-approved Meta message template to a single recipient.
 *
 * Body: { to, templateName, languageCode?, components? }
 */
router.post('/messages/template', async (req, res) => {
    try {
        const { to, templateName, languageCode = 'en_US', components = [] } = req.body;
        if (!to || !templateName) return res.status(400).json({ error: 'Missing required fields: to, templateName' });

        const ownerId = req.user.id;
        const cleanPhone = String(to).replace(/\D/g, '');

        // 1. Plan Limits Check
        const { msgCheck, settings } = await getOwnerContext(ownerId);
        if (!msgCheck.allowed) {
            return res.status(429).json({ error: 'Monthly message limit reached. Please upgrade your plan.', code: 'MESSAGE_LIMIT_REACHED' });
        }

        // 2. Settings Check
        if (!settings?.metaAccessToken) return res.status(403).json({ error: 'WhatsApp is not configured in your dashboard. Please add your Meta credentials.' });

        // 3. Find or Create Conversation
        const conversation = await findOrCreateConversation(ownerId, cleanPhone);

        // 4. Send to Meta API
        const payload = {
            messaging_product: "whatsapp",
            to: cleanPhone,
            type: "template",
            template: {
                name: templateName,
                language: { code: languageCode },
                components: components
            }
        };
        const metaRes = await sendToMeta(settings, payload);

        // 5. Build rich template data for dashboard rendering
        let richTemplateComponents = components;
        try {
            const template = await Template.findOne({ where: { name: templateName, userId: ownerId } });
            if (template) richTemplateComponents = [{ type: 'BODY', text: template.content || templateName }];
        } catch(e) { }

        // 6. Save Message
        const msg = await ChatMessage.create({
            conversationId: conversation.id,
            messageId: metaRes.messages?.[0]?.id || `api_sent_${Date.now()}`,
            direction: 'OUTBOUND',
            type: 'template',
            body: `Template: ${templateName}`,
            templateData: {
                name: templateName,
                language: languageCode,
                components: richTemplateComponents
            },
            status: 'sent',
            timestamp: new Date()
        });

        // 7. Update Conversation
        conversation.lastMessage = `Template: ${templateName}`;
        conversation.lastMessageAt = new Date();
        await conversation.save();

        res.json({ success: true, messageId: msg.messageId });

    } catch (err) {
        console.error("[/v1/messages/template] Error:", err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /v1/messages/session
 * Send a free-form text message (requires active 24-hour conversation window).
 *
 * Body: { to, text }
 */
router.post('/messages/session', async (req, res) => {
    try {
        const { to, text } = req.body;
        if (!to || !text) return res.status(400).json({ error: 'Missing required fields: to, text' });

        const ownerId = req.user.id;
        const cleanPhone = String(to).replace(/\D/g, '');

        // 1. Ensure conversation & active window exists
        const conversation = await Conversation.findOne({ where: { phoneNumber: cleanPhone, userId: ownerId } });
        if (!conversation) {
            return res.status(400).json({ error: 'No active conversation found. You must use a template message first to open the conversation.', code: 'NO_ACTIVE_CONVERSATION' });
        }

        const lastInbound = conversation.lastInboundMessageAt ? new Date(conversation.lastInboundMessageAt).getTime() : 0;
        const diffHours = (Date.now() - lastInbound) / (1000 * 60 * 60);

        if (!lastInbound || diffHours > 24) {
            return res.status(400).json({ error: '24-hour service window has expired. Please send a template message first to reopen the conversation.', code: 'WINDOW_EXPIRED' });
        }

        // 2. Plan Check
        const { msgCheck, settings } = await getOwnerContext(ownerId);
        if (!msgCheck.allowed) {
            return res.status(429).json({ error: 'Monthly message limit reached.', code: 'MESSAGE_LIMIT_REACHED' });
        }

        // 3. Settings Check
        if (!settings?.metaAccessToken) return res.status(403).json({ error: 'WhatsApp is not configured in your dashboard.' });

        // 4. Send to Meta
        const payload = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: cleanPhone,
            type: "text",
            text: { preview_url: false, body: text }
        };
        const metaRes = await sendToMeta(settings, payload);

        // 5. Save Message
        const msg = await ChatMessage.create({
            conversationId: conversation.id,
            messageId: metaRes.messages?.[0]?.id || `api_sent_${Date.now()}`,
            direction: 'OUTBOUND',
            type: 'text',
            body: text,
            status: 'sent',
            timestamp: new Date()
        });

        // 6. Update Conversation
        conversation.lastMessage = text;
        conversation.lastMessageAt = new Date();
        await conversation.save();

        res.json({ success: true, messageId: msg.messageId });

    } catch (err) {
        console.error("[/v1/messages/session] Error:", err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /v1/messages/bulk
 * Send the same template to multiple recipients in a single API call.
 * Each recipient counts toward the monthly message limit.
 *
 * Body: { recipients: string[], templateName, languageCode?, components? }
 * Returns: { success: true, results: [{ to, messageId, status, error? }] }
 *
 * Limits:
 *  - Max 50 recipients per call (prevents abuse & timeout)
 *  - Remaining plan limit is respected per-recipient; stops if limit hit
 */
router.post('/messages/bulk', async (req, res) => {
    try {
        const { recipients, templateName, languageCode = 'en_US', components = [] } = req.body;

        if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
            return res.status(400).json({ error: 'recipients must be a non-empty array of phone numbers.' });
        }
        if (!templateName) {
            return res.status(400).json({ error: 'templateName is required.' });
        }
        if (recipients.length > 50) {
            return res.status(400).json({ error: 'Maximum 50 recipients per bulk call. Split into batches of 50.' });
        }

        const ownerId = req.user.id;

        // Load settings once
        const settings = await Settings.findOne({ where: { userId: ownerId } });
        if (!settings?.metaAccessToken) {
            return res.status(403).json({ error: 'WhatsApp is not configured in your dashboard. Please add your Meta credentials.' });
        }

        // Load limits once
        const limits = await getUserPlanLimits(ownerId);

        // Load rich template data once (for dashboard display)
        let richBodyText = templateName;
        try {
            const template = await Template.findOne({ where: { name: templateName, userId: ownerId } });
            if (template) richBodyText = template.content || templateName;
        } catch(e) {}

        const results = [];

        for (const rawPhone of recipients) {
            const cleanPhone = String(rawPhone).replace(/\D/g, '');

            try {
                // Re-check limit for each recipient (count grows as we send)
                const sentSoFar = await getMonthlyMessageCount(ownerId);
                const limitCheck = checkLimit(sentSoFar, limits.messageLimit);

                if (!limitCheck.allowed) {
                    results.push({
                        to: cleanPhone,
                        status: 'failed',
                        error: 'Monthly message limit reached. Remaining recipients were not sent.',
                        code: 'MESSAGE_LIMIT_REACHED'
                    });
                    // Stop sending — all remaining recipients will also fail
                    const remaining = recipients.slice(recipients.indexOf(rawPhone) + 1);
                    for (const r of remaining) {
                        results.push({ to: String(r).replace(/\D/g, ''), status: 'skipped', error: 'Skipped: message limit reached.' });
                    }
                    break;
                }

                // Find or create conversation
                const conversation = await findOrCreateConversation(ownerId, cleanPhone);

                // Send to Meta
                const payload = {
                    messaging_product: "whatsapp",
                    to: cleanPhone,
                    type: "template",
                    template: {
                        name: templateName,
                        language: { code: languageCode },
                        components: components
                    }
                };
                const metaRes = await sendToMeta(settings, payload);
                const metaMsgId = metaRes.messages?.[0]?.id || `api_bulk_${Date.now()}`;

                // Save message to dashboard
                await ChatMessage.create({
                    conversationId: conversation.id,
                    messageId: metaMsgId,
                    direction: 'OUTBOUND',
                    type: 'template',
                    body: `Template: ${templateName}`,
                    templateData: {
                        name: templateName,
                        language: languageCode,
                        components: [{ type: 'BODY', text: richBodyText }]
                    },
                    status: 'sent',
                    timestamp: new Date()
                });

                // Update conversation
                conversation.lastMessage = `Template: ${templateName}`;
                conversation.lastMessageAt = new Date();
                await conversation.save();

                results.push({ to: cleanPhone, status: 'sent', messageId: metaMsgId });

            } catch (recipientErr) {
                results.push({ to: cleanPhone, status: 'failed', error: recipientErr.message });
            }
        }

        const sentCount = results.filter(r => r.status === 'sent').length;
        const failedCount = results.filter(r => r.status === 'failed').length;
        const skippedCount = results.filter(r => r.status === 'skipped').length;

        res.json({
            success: true,
            summary: { total: recipients.length, sent: sentCount, failed: failedCount, skipped: skippedCount },
            results
        });

    } catch (err) {
        console.error("[/v1/messages/bulk] Error:", err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /v1/status/:messageId
 * Check the delivery status of a message by its Meta message ID.
 */
router.get('/status/:messageId', async (req, res) => {
    try {
        const { messageId } = req.params;
        const ownerId = req.user.id;

        const msg = await ChatMessage.findOne({
            where: { messageId },
            include: [{
                model: Conversation,
                where: { userId: ownerId },
                attributes: ['phoneNumber', 'contactName']
            }],
            attributes: ['messageId', 'status', 'type', 'body', 'timestamp', 'createdAt']
        });

        if (!msg) {
            return res.status(404).json({ error: 'Message not found or does not belong to your account.' });
        }

        res.json({
            messageId: msg.messageId,
            status: msg.status,
            type: msg.type,
            to: msg.Conversation?.phoneNumber,
            contactName: msg.Conversation?.contactName,
            sentAt: msg.timestamp,
        });
    } catch (err) {
        console.error("[/v1/status] Error:", err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
