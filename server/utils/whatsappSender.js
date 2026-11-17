const Conversation = require('../models/Conversation');
const ChatMessage = require('../models/ChatMessage');
const Contact = require('../models/Contact');
const { getIo } = require('../socket');
const outbound = require('../services/outbound');

/**
 * Sends a WhatsApp message through the outbound gateway and logs it to the Live Inbox.
 * Credentials are resolved by the gateway (manual keys in Settings first, then the embedded-signup
 * token), so metaPhoneNumberId / metaAccessToken are only used when both are given.
 * Throws when the message is not sent (callers already catch); the failure is still recorded in
 * the ledger and shown in the inbox.
 */
async function sendWhatsAppAndLog({
    userId,
    metaPhoneNumberId,
    metaAccessToken,
    toPhone,
    type, // 'text', 'template', 'document', 'image', etc.
    payload,
    summaryBody, // String used for preview in inbox (e.g. "Sent document: Invoice.pdf" or the text body)
    source = 'store_order', // key from services/outbound/sources.js
    refs = {}
}) {
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

    // 2. Send through the gateway
    const sent = await outbound.sendMessage({
        ownerId: userId,
        source,
        to: cleanPhone,
        payload,
        refs: { conversationId: conversation.id, ...refs },
        credentials: metaPhoneNumberId && metaAccessToken ? { phoneNumberId: metaPhoneNumberId, token: metaAccessToken } : null
    });

    // 3. Log to the inbox (failed sends too, with the reason)
    const body = summaryBody || 'Sent an outbound message';
    const outMsg = await ChatMessage.create({
        conversationId: conversation.id,
        messageId: sent.wamid || null,
        direction: 'OUTBOUND',
        type: type,
        body,
        status: sent.ok ? 'sent' : 'failed',
        errorMessage: sent.ok ? null : (sent.friendly || sent.error),
        source,
        timestamp: new Date(),
        templateData: type === 'template' && payload.template ? { templateName: payload.template.name } : null
    });

    conversation.lastMessage = body;
    conversation.lastMessageAt = new Date();
    await conversation.save();
    try { getIo().to(userId).emit('new_message', { conversation, message: outMsg }); } catch (_) { /* socket optional */ }

    if (!sent.ok) {
        console.error('[WhatsAppSender] Not sent:', sent.errorCode, sent.error);
        const err = new Error(sent.error || 'Message not sent');
        err.code = sent.errorCode;
        err.response = { data: sent.data || { error: { message: sent.error, code: sent.errorCode } } };
        throw err;
    }
    return { success: true, data: sent.data, wamid: sent.wamid };
}

module.exports = { sendWhatsAppAndLog };
