const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const Conversation = require('../models/Conversation');
const ChatMessage = require('../models/ChatMessage');
const Settings = require('../models/Settings');
const Template = require('../models/Template');
const User = require('../models/User');
const auth = require('../middleware/auth');
const logActivity = require('../utils/logger');
const { getUserPlanLimits, checkLimit, getMonthlyMessageCount, getQuickReplyCount } = require('../utils/planLimits');
const { getIo } = require('../socket');
const { applyPrivacyMask } = require('../utils/privacy');
const Contact = require('../models/Contact');
const ContactFlowState = require('../models/ContactFlowState');

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

// GET /conversations - List of chats (supports teamPolicy visibility + assignedFilter)
router.get('/conversations', async (req, res) => {
    try {
        const { search = '', unreadOnly = 'false', limit = 300, assignedFilter = 'all' } = req.query;

        // Resolve the effective owner userId (sub-members use parentUserId as the workspace)
        const ownerId = req.user.parentUserId || req.user.id;
        const isSubMember = !!req.user.parentUserId;

        let whereClause = { userId: ownerId };

        // Apply teamPolicy visibility rules for sub-members
        if (isSubMember) {
            const visibility = req.user.teamPolicy?.inboxVisibility || 'see_all';

            if (visibility === 'see_assigned') {
                // Only show conversations assigned to this member
                whereClause.assignedTo = req.user.realId;
            }
            // 'see_all' and 'see_all_reply_assigned' both show all conversations
        }

        // Manual assignedFilter override (for tabs: mine / unassigned / all)
        if (assignedFilter === 'mine') {
            whereClause.assignedTo = req.user.realId || req.user.id;
        } else if (assignedFilter === 'unassigned') {
            whereClause.assignedTo = null;
        }

        if (search) {
            whereClause[Op.or] = [
                { contactName: { [Op.iLike]: `%${search}%` } },
                { phoneNumber: { [Op.like]: `%${search.replace(/\D/g, '')}%` } }
            ];
        }

        if (unreadOnly === 'true') {
            whereClause.unreadCount = { [Op.gt]: 0 };
        }

        const conversations = await Conversation.findAll({
            where: whereClause,
            order: [['lastMessageAt', 'DESC']],
            limit: parseInt(limit)
        });

        // Determine which conversations are actively in a Flow (for UI locking)
        const phoneNumbers = conversations.map(c => c.phoneNumber);
        const contacts = await Contact.findAll({
            where: { phone: { [Op.in]: phoneNumbers }, userId: ownerId },
            attributes: ['id', 'phone']
        });
        
        let inFlowMap = {};
        if (contacts.length > 0) {
            const activeFlows = await ContactFlowState.findAll({
                where: { contactId: { [Op.in]: contacts.map(c => c.id) } },
                attributes: ['contactId']
            });
            const flowContactIds = new Set(activeFlows.map(f => f.contactId));
            contacts.forEach(c => {
                if (flowContactIds.has(c.id)) inFlowMap[c.phone] = true;
            });
        }

        const data = conversations.map(c => {
            const json = c.toJSON();
            json.inFlow = !!inFlowMap[c.phoneNumber];
            return json;
        });

        res.json(applyPrivacyMask(data, req.user));
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

// GET /conversations/:id/contact - Fetch contact details for a conversation (Secure ID-based lookup)
router.get('/conversations/:id/contact', async (req, res) => {
    try {
        const ownerId = req.user.parentUserId || req.user.id;
        const conversation = await Conversation.findOne({
            where: { id: req.params.id, userId: ownerId }
        });

        if (!conversation) return res.status(404).json({ error: 'Conversation not found' });

        const contact = await Contact.findOne({
            where: { phone: conversation.phoneNumber, userId: ownerId }
        });

        if (!contact) {
            // Return a virtual contact if not in CRM
            return res.json(applyPrivacyMask({
                name: conversation.contactName || conversation.phoneNumber,
                phone: conversation.phoneNumber,
                isVirtual: true
            }, req.user));
        }

        res.json(applyPrivacyMask(contact, req.user));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /send/text - Send text message (Enforces 24h Rule)
router.post('/send/text', async (req, res) => {
    try {
        const { conversationId, body } = req.body;
        const ownerId = req.user.parentUserId || req.user.id;
        const isSubMember = !!req.user.parentUserId;

        console.log(`[CHAT API] POST /send/text | userId: ${req.user.id} | workspace: ${ownerId} | conversationId: ${conversationId}`);

        // Check monthly message limit (dynamic — reads from Plan in DB)
        const limits = await getUserPlanLimits(ownerId);
        const sentThisMonth = await getMonthlyMessageCount(ownerId);
        const msgCheck = checkLimit(sentThisMonth, limits.messageLimit);
        if (!msgCheck.allowed) {
            return res.status(429).json({
                error: `Monthly message limit reached (${msgCheck.used}/${msgCheck.limit}). Upgrade your plan to send more messages.`,
                code: 'LIMIT_REACHED',
                sentThisMonth: msgCheck.used,
                monthlyLimit: msgCheck.limit
            });
        }

        const conversation = await Conversation.findOne({ where: { id: conversationId, userId: ownerId } });
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

        // POST /conversations/:id/contact/groups - Update contact groups securely via conversation ID
router.post('/conversations/:id/contact/groups', async (req, res) => {
    try {
        const { tags } = req.body;
        const ownerId = req.user.parentUserId || req.user.id;
        const conversation = await Conversation.findOne({
            where: { id: req.params.id, userId: ownerId }
        });

        if (!conversation) return res.status(404).json({ error: 'Conversation not found' });

        let contact = await Contact.findOne({
            where: { phone: conversation.phoneNumber, userId: ownerId }
        });

        if (!contact) {
            // Auto-create contact if it doesn't exist
            contact = await Contact.create({
                name: conversation.contactName || conversation.phoneNumber,
                phone: conversation.phoneNumber,
                tags: tags || [],
                userId: ownerId,
                createdById: req.user.realId || req.user.id
            });
        } else {
            contact.tags = tags || [];
            await contact.save();
        }

        res.json(applyPrivacyMask(contact, req.user));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
        if (isSubMember && req.user.teamRole !== 'admin') {
            const visibility = req.user.teamPolicy?.inboxVisibility || 'see_all';
            if ((visibility === 'see_assigned' || visibility === 'see_all_reply_assigned') && conversation.assignedTo !== req.user.realId) {
                return res.status(403).json({ error: 'You are only allowed to reply to chats assigned to you.' });
            }
        }

        // 2. Get Settings
        const settings = await Settings.findOne({ where: { userId: ownerId } });
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
        const ownerId = req.user.parentUserId || req.user.id;
        const isSubMember = !!req.user.parentUserId;

        // Check monthly message limit (dynamic — reads from Plan in DB)
        const limits = await getUserPlanLimits(ownerId);
        const sentThisMonth = await getMonthlyMessageCount(ownerId);
        const msgCheck = checkLimit(sentThisMonth, limits.messageLimit);
        if (!msgCheck.allowed) {
            return res.status(429).json({
                error: `Monthly message limit reached (${msgCheck.used}/${msgCheck.limit}). Upgrade your plan to send more messages.`,
                code: 'LIMIT_REACHED',
                sentThisMonth: msgCheck.used,
                monthlyLimit: msgCheck.limit
            });
        }

        const conversation = await Conversation.findOne({ where: { id: conversationId, userId: ownerId } });
        if (!conversation) return res.status(404).json({ error: 'Conversation not found' });

        // Apply Team Policy Reply Lock
        if (isSubMember && req.user.teamRole !== 'admin') {
            const visibility = req.user.teamPolicy?.inboxVisibility || 'see_all';
            if ((visibility === 'see_assigned' || visibility === 'see_all_reply_assigned') && conversation.assignedTo !== req.user.realId) {
                return res.status(403).json({ error: 'You are only allowed to reply to chats assigned to you.' });
            }
        }

        const settings = await Settings.findOne({ where: { userId: ownerId } });
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
                ? await Template.findOne({ where: { id: templateId, userId: ownerId } })
                : await Template.findOne({ where: { name: templateName, userId: ownerId } });

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
        const ownerId = req.user.parentUserId || req.user.id;
        const conversation = await Conversation.findOne({ where: { id: req.params.id, userId: ownerId } });
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
        const ownerId = req.user.parentUserId || req.user.id;
        const conversation = await Conversation.findOne({ where: { id: req.params.id, userId: ownerId } });
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
        const ownerId = req.user.parentUserId || req.user.id;
        const conversation = await Conversation.findOne({ where: { id: req.params.id, userId: ownerId } });
        if (!conversation) return res.status(404).json({ error: 'Not found' });
        conversation.notes = req.body.notes ?? conversation.notes;
        await conversation.save();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PATCH /conversations/:id/bot-status - Update bot status
router.patch('/conversations/:id/bot-status', async (req, res) => {
    try {
        const ownerId = req.user.parentUserId || req.user.id;
        const conversation = await Conversation.findOne({ where: { id: req.params.id, userId: ownerId } });
        if (!conversation) return res.status(404).json({ error: 'Not found' });
        
        if (req.body.botStatus && ['active', 'paused'].includes(req.body.botStatus)) {
            conversation.botStatus = req.body.botStatus;
            await conversation.save();
            
            // If taking over (pausing bot), clear any active FlowBuilder context
            if (req.body.botStatus === 'paused') {
                try {
                    await ContactFlowState.destroy({
                        where: {
                            userId: ownerId,
                            contactWaId: conversation.phoneNumber
                        }
                    });
                } catch (flowErr) {
                    console.error('[CHAT] Error clearing flow state on takeover:', flowErr.message);
                }
            }

            // Emit via socket to sync clients
            try {
                const io = getIo();
                if (io) {
                    io.to(ownerId).emit('conversation_bot_update', {
                        conversationId: conversation.id,
                        botStatus: req.body.botStatus
                    });
                }
            } catch (socketErr) {
                console.warn('[CHAT] Socket emit failed for bot-status:', socketErr.message);
            }
        }
        res.json({ success: true, botStatus: conversation.botStatus });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /conversations/:id/assign - Assign conversation to a team member
router.put('/conversations/:id/assign', async (req, res) => {
    try {
        const ownerId = req.user.parentUserId || req.user.id;
        // Only owner or admin can assign
        if (req.user.parentUserId && req.user.teamRole !== 'admin') {
            return res.status(403).json({ error: 'Only the owner or admin can assign conversations.' });
        }

        const { assignedToId } = req.body; // null to unassign

        const conversation = await Conversation.findOne({ where: { id: req.params.id, userId: ownerId } });
        if (!conversation) return res.status(404).json({ error: 'Conversation not found' });

        if (assignedToId) {
            // Validate that target is a team member of the owner
            const member = await User.findOne({
                where: { id: assignedToId, parentUserId: ownerId }
            });
            // Also allow assigning to the owner themselves
            const isOwner = assignedToId === ownerId;
            if (!member && !isOwner) {
                return res.status(403).json({ error: 'Target user is not a member of this workspace.' });
            }

            const assigneeName = member ? member.name : (await User.findByPk(ownerId))?.name || 'Owner';
            conversation.assignedTo = assignedToId;
            conversation.assignedToName = assigneeName;
        } else {
            // Unassign
            conversation.assignedTo = null;
            conversation.assignedToName = null;
        }

        await conversation.save();

        // Emit real-time notification to the assigned user
        try {
            const io = getIo();
            if (io && assignedToId) {
                io.to(assignedToId).emit('conversation_assigned', {
                    conversation: conversation.toJSON(),
                    assignedBy: req.user.name || 'Owner'
                });
            }
        } catch (socketErr) {
            console.warn('[ASSIGN] Socket emit failed:', socketErr.message);
        }

        await logActivity(req, 'CHAT_ASSIGNED', `Assigned conversation ${conversation.id} to ${conversation.assignedToName || 'unassigned'}`);

        res.json({ success: true, conversation: conversation.toJSON() });
    } catch (err) {
        console.error('[ASSIGN] Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET /quick-replies - List all quick replies for user
router.get('/quick-replies', async (req, res) => {
    try {
        const QuickReply = require('../models/QuickReply');
        const ownerId = req.user.parentUserId || req.user.id;
        const replies = await QuickReply.findAll({
            where: { userId: ownerId },
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
        const ownerId = req.user.parentUserId || req.user.id;
        const limits = await getUserPlanLimits(ownerId);
        const quickReplyCount = await getQuickReplyCount(ownerId);
        
        const limitCheck = checkLimit(quickReplyCount, limits.quickReplyLimit);
        if (!limitCheck.allowed) {
            return res.status(403).json({ 
                error: `Plan limit reached: You can only have up to ${limitCheck.limit} Quick Replies.` 
            });
        }

        const QuickReply = require('../models/QuickReply');
        const { shortcut, message } = req.body;
        if (!shortcut || !message) return res.status(400).json({ error: 'shortcut and message are required' });
        // Create quick reply for the owner workspace
        const reply = await QuickReply.create({ shortcut: shortcut.toLowerCase(), message, userId: ownerId });
        res.json(reply);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /quick-replies/:id - Delete a quick reply
router.delete('/quick-replies/:id', async (req, res) => {
    try {
        const QuickReply = require('../models/QuickReply');
        const ownerId = req.user.parentUserId || req.user.id;
        await QuickReply.destroy({ where: { id: req.params.id, userId: ownerId } });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const storageProvider = require('../utils/storageProvider');

router.post('/send/media', storageProvider('chat_media', { fileFilter: storageProvider.whatsappMediaFilter }).single('file'), async (req, res) => {
    try {
        const { conversationId, mediaType, caption } = req.body;
        const file = req.file;
        const ownerId = req.user.parentUserId || req.user.id;
        const isSubMember = !!req.user.parentUserId;

        if (!file) return res.status(400).json({ error: 'No file uploaded' });

        const conversation = await Conversation.findOne({ where: { id: conversationId, userId: ownerId } });
        if (!conversation) return res.status(404).json({ error: 'Conversation not found' });

        // Apply Team Policy Reply Lock
        if (isSubMember && req.user.teamRole !== 'admin') {
            const visibility = req.user.teamPolicy?.inboxVisibility || 'see_all';
            if ((visibility === 'see_assigned' || visibility === 'see_all_reply_assigned') && conversation.assignedTo !== req.user.realId) {
                return res.status(403).json({ error: 'You are only allowed to reply to chats assigned to you.' });
            }
        }

        const lastInbound = conversation.lastInboundMessageAt ? new Date(conversation.lastInboundMessageAt).getTime() : 0;
        if (!lastInbound || (Date.now() - lastInbound) / (1000 * 60 * 60) > 24) {
            return res.status(400).json({ error: '24-hour window expired. Send a template message first.', code: 'WINDOW_EXPIRED' });
        }

        const settings = await Settings.findOne({ where: { userId: ownerId } });
        if (!settings?.metaAccessToken) return res.status(403).json({ error: 'WhatsApp not configured' });

        // Use publicUrl assigned by storageProvider
        const publicUrl = req.file.publicUrl;

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

// POST /api/chat/ai-draft - AI Draft Reply
router.post('/ai-draft', async (req, res) => {
    try {
        const { conversationId } = req.body;
        if (!conversationId) return res.status(400).json({ error: 'Conversation ID required' });

        const SystemConfig = require('../models/SystemConfig');
        const sysConfig = await SystemConfig.getConfig();
        const multiplier = sysConfig?.settings?.aiTokenMultipliers?.ai_chat_drafter ?? 1;
        const BASE_COST = 10;
        const finalCost = Math.ceil(BASE_COST * multiplier);

        const User = require('../models/User');
        const user = await User.findByPk(req.user.id);
        if (!user || user.aiTokenBalance < finalCost) {
            return res.status(402).json({ error: `Insufficient AI tokens. Required: ${finalCost}` });
        }

        const messages = await ChatMessage.findAll({
            where: { conversationId },
            order: [['timestamp', 'DESC']],
            limit: 15
        });

        if (!messages || messages.length === 0) {
            return res.status(400).json({ error: 'No conversation history found to draft a reply.' });
        }

        messages.reverse(); // Chronological order

        let chatHistory = messages.map(m => {
            const sender = m.direction === 'INBOUND' ? 'Customer' : 'Us';
            return `${sender}: ${m.body || '[Media/Template]'}`;
        }).join('\n');

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY is missing' });
        const aiModel = sysConfig?.settings?.aiModel || 'gemini-2.0-flash';
        const axios = require('axios');

        const systemInstruction = `You are a professional customer service agent responding on behalf of the business.
Read the chat history carefully and write a complete, ready-to-send reply to the customer's latest message.
Rules:
- Output ONLY the final reply text. No intro, no quotes, no labels like "Reply:" or "Draft:".
- The reply MUST be a fully complete sentence or set of sentences. Never end mid-sentence.
- Keep it under 4 sentences. Be warm, professional, and concise.
- Do not apologize for technical issues unless the customer explicitly complained about one.`;

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${aiModel}:generateContent?key=${apiKey}`;
        const payload = {
            systemInstruction: { parts: [{ text: systemInstruction }] },
            contents: [{ role: 'user', parts: [{ text: `Chat History:\n${chatHistory}\n\nDraft our reply:` }] }],
            generationConfig: { temperature: 0.6, maxOutputTokens: 1024 }
        };

        const aiRes = await axios.post(url, payload, { headers: { 'Content-Type': 'application/json' } });
        let replyText = aiRes.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        replyText = replyText.replace(/```(whatsapp|text|markdown)?/gi, '').replace(/```/gi, '').trim();

        await user.decrement('aiTokenBalance', { by: finalCost });
        const newBal = (user.aiTokenBalance - finalCost);

        const AiTokenLog = require('../models/AiTokenLog');
        await AiTokenLog.create({
            userId: req.user.id,
            feature: 'ai_chat_drafter',
            tokensUsed: finalCost,
            balanceAfter: Math.max(0, newBal)
        });

        res.json({ draft: replyText, tokensDeducted: finalCost, newBalance: newBal });
    } catch (err) {
            const aiErrMsg = err.response?.data?.error?.message || err.message;
            console.error('AI Draft Error:', err.response?.data || err.message);
            res.status(500).json({ error: `AI Error: ${aiErrMsg}` });
        }
});

// POST /api/chat/ai-enhance - AI Enhance Chat Message
router.post('/ai-enhance', async (req, res) => {
    try {
        const { text } = req.body;
        if (!text) return res.status(400).json({ error: 'Text to enhance is required' });

        const SystemConfig = require('../models/SystemConfig');
        const sysConfig = await SystemConfig.getConfig();
        const multiplier = sysConfig?.settings?.aiTokenMultipliers?.ai_chat_enhancer ?? 1;
        const BASE_COST = 5;
        const finalCost = Math.ceil(BASE_COST * multiplier);

        const User = require('../models/User');
        const user = await User.findByPk(req.user.id);
        if (!user || user.aiTokenBalance < finalCost) {
            return res.status(402).json({ error: `Insufficient AI tokens. Required: ${finalCost}` });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY is missing' });
        const aiModel = sysConfig?.settings?.aiModel || 'gemini-2.0-flash';
        const axios = require('axios');

        const systemInstruction = `You are a professional customer support agent.
Enhance and proofread the user's chat message to make it sound highly professional, polite, and clear.
Fix any grammar mistakes. Keep the overall meaning and core exact information identical. Do not add assumptions.
Output ONLY the final enhanced message text.`;

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${aiModel}:generateContent?key=${apiKey}`;
        const payload = {
            systemInstruction: { parts: [{ text: systemInstruction }] },
            contents: [{ role: 'user', parts: [{ text: text }] }],
            generationConfig: { temperature: 0.5, maxOutputTokens: 256 }
        };

        const aiRes = await axios.post(url, payload, { headers: { 'Content-Type': 'application/json' } });
        let replyText = aiRes.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        replyText = replyText.replace(/```(whatsapp|text|markdown)?/gi, '').replace(/```/gi, '').trim();

        await user.decrement('aiTokenBalance', { by: finalCost });
        const newBal = (user.aiTokenBalance - finalCost);

        const AiTokenLog = require('../models/AiTokenLog');
        await AiTokenLog.create({
            userId: req.user.id,
            feature: 'ai_chat_enhancer',
            tokensUsed: finalCost,
            balanceAfter: Math.max(0, newBal)
        });

        res.json({ enhancedText: replyText, tokensDeducted: finalCost, newBalance: newBal });
    } catch (err) {
        const aiErrMsg = err.response?.data?.error?.message || err.message;
        console.error('AI Enhance Error:', err.response?.data || err.message);
        res.status(500).json({ error: `AI Error: ${aiErrMsg}` });
    }
});

module.exports = router;
