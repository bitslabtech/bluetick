const axios = require('axios');
const Conversation = require('../models/Conversation');
const ChatMessage = require('../models/ChatMessage');
const Contact = require('../models/Contact');
const { getIo } = require('../socket');

/**
 * Sends a WhatsApp message via Meta API and logs it to the Live Inbox (Conversation/ChatMessage).
 * This prevents isolated outbound API calls from bypassing the CRM.
 */
async function sendWhatsAppAndLog({
    userId,
    metaPhoneNumberId,
    metaAccessToken,
    toPhone,
    type, // 'text', 'template', 'document', 'image', etc.
    payload,
    summaryBody // String used for preview in inbox (e.g. "Sent document: Invoice.pdf" or the text body)
}) {
    try {
        const cleanPhone = String(toPhone).replace(/\D/g, '');
        
        // 1. Find or create conversation
        let conversation = await Conversation.findOne({ where: { phoneNumber: cleanPhone, userId } });
        if (!conversation) {
            const contact = await Contact.findOne({ where: { phone: cleanPhone, userId } });
            conversation = await Conversation.create({
                userId,
                phoneNumber: cleanPhone,
                contactName: contact ? contact.name : cleanPhone,
                status: 'open',
                unreadCount: 0
            });
        }

        // 2. Send via Meta API
        const metaRes = await axios.post(
            `https://graph.facebook.com/v22.0/${metaPhoneNumberId}/messages`,
            payload,
            { headers: { Authorization: `Bearer ${metaAccessToken}`, 'Content-Type': 'application/json' } }
        );

        const metaMsgId = metaRes.data?.messages?.[0]?.id;

        // 3. Log to ChatMessage
        if (metaMsgId) {
            const outMsg = await ChatMessage.create({
                conversationId: conversation.id,
                messageId: metaMsgId,
                direction: 'OUTBOUND',
                type: type,
                body: summaryBody || 'Sent an outbound message',
                status: 'sent',
                timestamp: new Date(),
                templateData: type === 'template' && payload.template ? { templateName: payload.template.name } : null
            });

            // 4. Update Conversation
            conversation.lastMessage = summaryBody || 'Sent an outbound message';
            conversation.lastMessageAt = new Date();
            await conversation.save();

            // 5. Emit socket event
            getIo().to(userId).emit('new_message', { conversation, message: outMsg });
        }

        return { success: true, data: metaRes.data };
    } catch (err) {
        console.error('[WhatsAppSender] Error:', err.response?.data || err.message);
        throw err;
    }
}

module.exports = { sendWhatsAppAndLog };
