const axios = require('axios');
const SystemConfig = require('../models/SystemConfig');
const User = require('../models/User');
const Settings = require('../models/Settings');

/**
 * Dispatches a WhatsApp message using the Linked Platform Communications Account.
 * 
 * @param {string} to - The recipient's phone number (with country code, no +)
 * @param {string} type - Message type: 'text' or 'template'
 * @param {Object} payload - The message payload (text body, or template name/components)
 * @returns {Promise<Object>} The API response
 */
const sendSystemMessage = async (to, type, payload) => {
    try {
        const config = await SystemConfig.getCachedConfig();
        const linkedAdminId = config?.settings?.linkedAdminUserId;

        if (!linkedAdminId) {
            console.warn('System Messenger: No linked platform CRM account. Aborting message.');
            return { success: false, error: 'No linked account' };
        }

        // Fetch the linked admin user to get their Meta credentials
        const adminUser = await User.findByPk(linkedAdminId);
        if (!adminUser) {
            console.warn('System Messenger: Linked account not found. Aborting message.');
            return { success: false, error: 'Linked account not found' };
        }

        const adminSettings = await Settings.findOne({ where: { userId: linkedAdminId } });
        if (!adminSettings || !adminSettings.metaPhoneNumberId || !adminSettings.metaAccessToken) {
            console.warn('System Messenger: Linked account lacks WhatsApp configuration. Aborting message.');
            return { success: false, error: 'Linked account not configured' };
        }

        const token = adminSettings.metaAccessToken.replace(/[^\x20-\x7E]/g, '').trim();
        const phoneId = adminSettings.metaPhoneNumberId.replace(/[^\x20-\x7E]/g, '').trim();
        const url = `https://graph.facebook.com/v21.0/${phoneId}/messages`;
        
        let data = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: to,
            type: type
        };

        if (type === 'text') {
            data.text = { preview_url: true, body: payload.body };
        } else if (type === 'template') {
            data.template = {
                name: payload.templateName,
                language: { code: payload.languageCode || 'en' },
                components: payload.components || []
            };
        }

        const res = await axios.post(url, data, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        // Track stats for the admin user
        if (adminUser.totalMessagesSent !== undefined) {
            adminUser.increment('totalMessagesSent');
        }

        // ==========================================
        // Log to Chat Database for Inbox Visibility
        // ==========================================
        try {
            const Conversation = require('../models/Conversation');
            const ChatMessage = require('../models/ChatMessage');

            // Find or Create Conversation
            let conversation = await Conversation.findOne({
                where: { userId: linkedAdminId, phoneNumber: to }
            });

            if (!conversation) {
                conversation = await Conversation.create({
                    userId: linkedAdminId,
                    phoneNumber: to,
                    contactName: to, // It will be updated by webhook if they reply, or we sync contacts
                    unreadCount: 0
                });
            }

            let msgBody = '';
            let templateData = null;
            if (type === 'text') {
                msgBody = payload.body;
            } else if (type === 'template') {
                const bodyComp = (payload.components || []).find(c => c.type === 'body');
                const bodyParams = bodyComp?.parameters || [];

                // Try to fetch the actual template body text from the local DB
                // so we can substitute {{1}}, {{2}}, {{3}} with real values
                let resolvedBodyText = '';
                try {
                    const Template = require('../models/Template');
                    const tpl = await Template.findOne({ where: { name: payload.templateName, userId: linkedAdminId } });
                    if (tpl && tpl.content) {
                        // Replace {{1}}, {{2}}, ... with the actual sent parameter values
                        resolvedBodyText = tpl.content.replace(/\{\{(\d+)\}\}/g, (_, num) => {
                            const idx = parseInt(num, 10) - 1;
                            return bodyParams[idx]?.text || `{{${num}}}`;
                        });
                    }
                } catch (tplErr) {
                    // Template lookup failed — fall back silently
                }

                // Fallback if template not found locally
                if (!resolvedBodyText) {
                    resolvedBodyText = bodyParams.map(p => p.text || '').join(' | ');
                }

                msgBody = resolvedBodyText || `Template: ${payload.templateName}`;

                // Build templateData in the format the inbox renderer expects
                templateData = {
                    name: payload.templateName,
                    language: payload.languageCode || 'en',
                    components: [
                        {
                            type: 'BODY',
                            text: resolvedBodyText
                        }
                    ]
                };
            }

            await ChatMessage.create({
                conversationId: conversation.id,
                messageId: res.data?.messages?.[0]?.id || `sys_${Date.now()}`,
                direction: 'OUTBOUND',
                type: type,
                body: msgBody,
                templateData: templateData,
                status: 'sent',
                timestamp: new Date()
            });

            conversation.lastMessage = msgBody;
            conversation.lastMessageAt = new Date();
            await conversation.save();

        } catch (dbErr) {
            console.error('System Messenger: Failed to log message to DB:', dbErr.message);
        }

        return { success: true, data: res.data };
    } catch (err) {
        console.error('System Messenger Error:', err.response?.data || err.message);
        return { success: false, error: err.response?.data || err.message };
    }
};

module.exports = {
    sendSystemMessage
};
