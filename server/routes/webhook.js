const express = require('express');
const router = express.Router();
const { getIo } = require('../socket');
const Conversation = require('../models/Conversation');
const ChatMessage = require('../models/ChatMessage');
const MessageLog = require('../models/MessageLog');
const Settings = require('../models/Settings');
const User = require('../models/User');
const Template = require('../models/Template');
const SystemNotification = require('../models/SystemNotification');

// GET /api/webhook/:userId - Webhook Verification
router.get('/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;

        // Hardcoded Token
        const verify_token = '12345678';

        const mode = req.query['hub.mode'];
        const token = req.query['hub.verify_token'];
        const challenge = req.query['hub.challenge'];

        if (mode && token) {
            if (mode === 'subscribe' && token === verify_token) {
                console.log(`[WEBHOOK] VERIFIED for user ${userId}`);
                res.status(200).send(challenge);
            } else {
                res.sendStatus(403);
            }
        } else {
            res.sendStatus(400);
        }
    } catch (error) {
        console.error('[WEBHOOK] Verification Error:', error);
        res.sendStatus(500);
    }
});

// POST /api/webhook/:userId - Receive Messages and Status Updates
router.post('/:userId', async (req, res) => {
    try {
        console.log('==========================================');
        console.log(`[WEBHOOK] POST /api/webhook/${req.params.userId}`);
        console.log('[WEBHOOK] RAW BODY:', JSON.stringify(req.body, null, 2));
        console.log('==========================================');

        const body = req.body;

        if (body.object !== 'whatsapp_business_account') {
            return res.sendStatus(404);
        }

        const userId = req.params.userId;
        const user = await User.findByPk(userId);
        if (!user) {
            console.error(`[WEBHOOK ERROR] Unknown User ID: ${userId}`);
            return res.sendStatus(404);
        }

        for (const entry of body.entry) {
            for (const change of entry.changes) {
                // ─── 0. HANDLE TEMPLATE STATUS UPDATES ───
                if (change.field === 'message_template_status_update') {
                    const statusUpdate = change.value;
                    const metaTemplateId = statusUpdate.message_template_id;
                    const eventStatus = statusUpdate.event; // "APPROVED", "REJECTED", etc.
                    const templateName = statusUpdate.message_template_name;
                    const rejectReason = statusUpdate.reason;

                    console.log(`[WEBHOOK] Template Status Update: ${templateName} -> ${eventStatus}`);

                    try {
                        const template = await Template.findOne({ where: { metaTemplateId, userId } });
                        if (template) {
                            template.status = eventStatus;
                            await template.save();

                            const user = await User.findByPk(userId);
                            if (user) {
                                let type = 'Info';
                                let message = `Your template "${templateName}" status is now ${eventStatus}.`;

                                if (eventStatus === 'APPROVED') {
                                    type = 'Success';
                                    message = `Great news! Your template "${templateName}" has been approved by Meta.`;
                                } else if (eventStatus === 'REJECTED') {
                                    type = 'Error';
                                    message = `Your template "${templateName}" was rejected by Meta. ${rejectReason ? 'Reason: ' + rejectReason : ''}`;
                                }

                                await SystemNotification.create({
                                    recipient: user.email,
                                    type: type,
                                    title: `Template ${eventStatus}`,
                                    message: message,
                                    target: `User: ${user.email}`,
                                    status: 'Sent'
                                });

                                getIo().to(userId).emit('notification_update');
                                getIo().to(userId).emit('template_status_update', {
                                    id: template.id,
                                    status: eventStatus
                                });
                            }
                        } else {
                            console.log(`[WEBHOOK] No Template found for metaTemplateId: ${metaTemplateId}`);
                        }
                    } catch (err) {
                        console.error('[WEBHOOK ERROR] Failed to update template status from webhook:', err.message);
                    }
                    continue;
                }

                if (change.field !== 'messages') continue;

                const value = change.value;

                // ─── 1. HANDLE STATUS UPDATES (Delivered / Read / Failed) ───
                // This covers BOTH campaign messages (MessageLog) AND inbox messages (ChatMessage)
                if (value.statuses && value.statuses.length > 0) {
                    for (const statusUpdate of value.statuses) {
                        const metaMessageId = statusUpdate.id;
                        // Meta sends lowercase: 'sent', 'delivered', 'read', 'failed'
                        const rawStatus = statusUpdate.status;
                        const upperStatus = rawStatus.toUpperCase();

                        console.log(`[WEBHOOK] Status Update: ${upperStatus} for messageId: ${metaMessageId}`);

                        // --- Update Campaign MessageLog ---
                        try {
                            const log = await MessageLog.findOne({ where: { messageId: metaMessageId } });
                            if (log) {
                                console.log(`[WEBHOOK] Found MessageLog (campaign): ${log.id} | Updating status: ${log.status} → ${upperStatus}`);
                                log.status = upperStatus;
                                if (statusUpdate.timestamp) log.metaTimestamp = statusUpdate.timestamp;
                                if (rawStatus === 'failed') log.error = statusUpdate.errors?.[0]?.title || 'Meta Error';
                                await log.save();
                                console.log(`[WEBHOOK] MessageLog updated OK`);
                            } else {
                                console.log(`[WEBHOOK] No MessageLog found for messageId: ${metaMessageId}`);
                            }
                        } catch (err) {
                            console.error('[WEBHOOK ERROR] Failed to update MessageLog:', err.message);
                        }

                        // --- Update Inbox ChatMessage ---
                        try {
                            const chatMsg = await ChatMessage.findOne({ where: { messageId: metaMessageId } });
                            if (chatMsg) {
                                console.log(`[WEBHOOK] Found ChatMessage (inbox): ${chatMsg.id} | Updating status: ${chatMsg.status} → ${rawStatus}`);
                                chatMsg.status = rawStatus; // Inbox uses lowercase: 'sent', 'delivered', 'read'
                                await chatMsg.save();

                                // Emit to frontend for real-time tick update
                                try {
                                    getIo().to(userId).emit('message_status_update', {
                                        messageId: metaMessageId,
                                        conversationId: chatMsg.conversationId,
                                        status: rawStatus
                                    });
                                    console.log(`[WEBHOOK] Socket emit message_status_update to room: ${userId}`);
                                } catch (socketErr) {
                                    console.error('[WEBHOOK ERROR] Socket emit failed:', socketErr.message);
                                }
                            } else {
                                console.log(`[WEBHOOK] No ChatMessage found for messageId: ${metaMessageId}`);
                            }
                        } catch (err) {
                            console.error('[WEBHOOK ERROR] Failed to update ChatMessage:', err.message);
                        }
                    }
                }

                // ─── 2. HANDLE INCOMING MESSAGES ───
                if (value.messages && value.messages.length > 0) {
                    for (const message of value.messages) {
                        const contactName = value.contacts?.[0]?.profile?.name || 'Unknown';
                        const contactWaId = message.from; // Customer's WhatsApp ID (phone number)
                        const messageId = message.id;
                        const timestamp = message.timestamp * 1000; // Unix seconds → ms

                        let messageType = message.type;
                        let messageBody = '';

                        switch (messageType) {
                            case 'text':
                                messageBody = message.text.body;
                                break;
                            case 'image':
                                messageBody = '📸 Image Attachment';
                                break;
                            case 'document':
                                messageBody = '📄 Document Attachment';
                                break;
                            case 'audio':
                                messageBody = '🎤 Audio Message';
                                break;
                            case 'button':
                                messageBody = message.button.text;
                                break;
                            default:
                                messageBody = `[${messageType}]`;
                                messageType = 'unknown';
                        }

                        console.log(`[WEBHOOK] Incoming message from ${contactWaId}: "${messageBody}"`);

                        // Find or create Conversation
                        let conversation = await Conversation.findOne({
                            where: { phoneNumber: contactWaId, userId }
                        });

                        if (!conversation) {
                            console.log(`[WEBHOOK] Creating new conversation for ${contactWaId}`);
                            conversation = await Conversation.create({
                                phoneNumber: contactWaId,
                                contactName,
                                userId,
                                lastMessageAt: new Date(timestamp),
                                lastInboundMessageAt: new Date(timestamp),
                                unreadCount: 1,
                                lastMessage: messageBody
                            });
                        } else {
                            console.log(`[WEBHOOK] Updating existing conversation: ${conversation.id}`);
                            conversation.lastMessageAt = new Date(timestamp);
                            conversation.lastInboundMessageAt = new Date(timestamp);
                            conversation.unreadCount += 1;
                            conversation.lastMessage = messageBody;
                            conversation.contactName = contactName;
                            await conversation.save();
                        }

                        // Save message (deduplicated by messageId)
                        const [chatMessage, created] = await ChatMessage.findOrCreate({
                            where: { messageId },
                            defaults: {
                                conversationId: conversation.id,
                                messageId,
                                direction: 'INBOUND',
                                type: messageType,
                                body: messageBody,
                                status: 'delivered',
                                timestamp: new Date(timestamp)
                            }
                        });

                        if (created) {
                            console.log(`[WEBHOOK] Message saved. Emitting new_message to socket room: ${userId}`);
                            try {
                                getIo().to(userId).emit('new_message', {
                                    conversation,
                                    message: chatMessage
                                });
                            } catch (e) {
                                console.error('[WEBHOOK ERROR] Socket emit failed:', e.message);
                            }
                        } else {
                            console.log(`[WEBHOOK] Duplicate message ignored: ${messageId}`);
                        }
                    }
                }
            }
        }

        res.sendStatus(200);

    } catch (error) {
        console.error('[WEBHOOK ERROR]', error);
        res.sendStatus(500);
    }
});

module.exports = router;
