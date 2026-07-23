const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const axios = require('axios');
const { Sequelize } = require('sequelize');
const { getIo } = require('../socket');
const Conversation = require('../models/Conversation');
const ChatMessage = require('../models/ChatMessage');
const MessageLog = require('../models/MessageLog');
const Settings = require('../models/Settings');
const User = require('../models/User');
const Template = require('../models/Template');
const SystemNotification = require('../models/SystemNotification');
const UserAddon = require('../models/UserAddon');
const Addon = require('../models/Addon');
const Contact = require('../models/Contact'); // NEW
const { fireCapiEvent } = require('./ctwa'); // Phase 5: CAPI auto-fire
const Flow = require('../models/Flow'); // NEW
const ContactFlowState = require('../models/ContactFlowState'); // NEW
const FlowRunner = require('../services/FlowRunner'); // NEW
const { getMonthlyMessageCount, getUserPlanLimits } = require('../utils/planLimits');
const { applyAutoTags } = require('../services/AutoTagger'); // Auto-Tagging Engine
const { processAndStoreBuffer } = require('../utils/storageProvider');
const path = require('path');
const fs = require('fs');

// GET /api/webhook/:userId - Webhook Verification
router.get('/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;

        // Hardcoded Token
        const verify_token = process.env.WEBHOOK_VERIFY_TOKEN;

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
router.post('/:userId', (req, res, next) => {
    // HMAC signature verification
    const signature = req.headers['x-hub-signature-256'];
    if (!signature) {
        console.warn(`[WEBHOOK] No signature provided`);
        return res.sendStatus(403);
    }
    
    const secret = process.env.FB_CLIENT_SECRET;
    if (!secret) {
        console.warn(`[WEBHOOK] FB_CLIENT_SECRET is not configured!`);
        return res.sendStatus(500);
    }

    const expectedSig = 'sha256=' + crypto
        .createHmac('sha256', secret)
        .update(req.rawBody || JSON.stringify(req.body))
        .digest('hex');

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
        console.warn(`[WEBHOOK] Invalid signature`);
        return res.sendStatus(403);
    }
    next();
}, async (req, res) => {
    try {
        console.log('==========================================');
        console.log(`[WEBHOOK] POST /api/webhook/${req.params.userId}`);
        console.log('[WEBHOOK] RAW BODY:', JSON.stringify(req.body, null, 2));
        console.log('==========================================');

        const body = req.body;

        if (body.object !== 'whatsapp_business_account') {
            return res.sendStatus(404);
        }

        let userId = req.params.userId;
        let user = null;

        // In Embedded Signup, a single Meta App receives webhooks for multiple users.
        // The webhook URL might be hardcoded to an admin's userId in the App Dashboard.
        // So we must dynamically route the webhook to the correct User based on the phone_number_id or WABA ID in the payload.
        let foundSettings = null;
        try {
            for (const entry of body.entry) {
                const wabaId = entry.id;
                for (const change of entry.changes) {
                    const phoneNumberId = change.value?.metadata?.phone_number_id;
                    if (phoneNumberId) {
                        foundSettings = await Settings.findOne({ where: { metaPhoneNumberId: String(phoneNumberId) } });
                    }
                    if (!foundSettings && wabaId) {
                        foundSettings = await Settings.findOne({ where: { metaBusinessAccountId: String(wabaId) } });
                    }
                    if (foundSettings) {
                        userId = foundSettings.userId;
                        break;
                    }
                }
                if (foundSettings) break;
            }
        } catch (e) {
            console.error('[WEBHOOK ERROR] Failed to dynamically resolve userId:', e.message);
        }

        user = await User.findByPk(userId);
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
                    const eventStatus = statusUpdate.event; // "APPROVED", "REJECTED", "FLAGGED", "PAUSED", etc.
                    const templateName = statusUpdate.message_template_name;
                    const rejectReason = statusUpdate.reason;
                    // Meta sends new_category when it reclassifies a template (e.g. UTILITY → MARKETING)
                    const newCategory = statusUpdate.new_category || null;

                    console.log(`[WEBHOOK] Template Status Update: ${templateName} -> ${eventStatus}${newCategory ? ` (category reclassified to ${newCategory})` : ''}`);

                    try {
                        const template = await Template.findOne({ where: { metaTemplateId, userId } });
                        if (template) {
                            let categoryChanged = false;
                            template.status = eventStatus;

                            // ── Sync category if Meta reclassified this template ──────────────────
                            if (newCategory && template.category !== newCategory) {
                                console.log(`[WEBHOOK] Template "${templateName}" category reclassified: ${template.category} → ${newCategory}`);
                                template.category = newCategory;
                                categoryChanged = true;
                            }

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

                                // Extra notification if Meta changed the category
                                if (categoryChanged) {
                                    await SystemNotification.create({
                                        recipient: user.email,
                                        type: 'Warning',
                                        title: 'Template Category Changed by Meta',
                                        message: `Meta reclassified your template "${templateName}" from its previous category to ${newCategory}. This may affect how it is billed and displayed.`,
                                        target: `User: ${user.email}`,
                                        status: 'Sent'
                                    });
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
                                    status: eventStatus,
                                    ...(categoryChanged && { category: newCategory })
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

                // ─── 0b. HANDLE PHONE NUMBER QUALITY RATING UPDATES ─────────────────────
                // Meta fires this when the quality rating changes (GREEN ↔ YELLOW ↔ RED)
                // Webhook field: "phone_number_quality_update"
                if (change.field === 'phone_number_quality_update') {
                    const qUpdate = change.value;
                    // e.g. { display_phone_number: "+1...", event: "QUALITY_RATING_CHANGED",
                    //         current_limit: "TIER_50", previous_quality_rating: "GREEN", new_quality_rating: "YELLOW" }
                    const newRating  = qUpdate.new_quality_rating || qUpdate.current_quality_rating || null;
                    const prevRating = qUpdate.previous_quality_rating || null;
                    console.log(`[WEBHOOK] Quality Rating Update: ${prevRating} → ${newRating}`);

                    try {
                        const user = await User.findByPk(userId);
                        if (user && newRating) {
                            user.metaQualityRating = newRating;
                            await user.save();

                            // Build notification based on direction of change
                            let notifType    = 'Info';
                            let notifTitle   = 'WhatsApp Quality Rating Changed';
                            let notifMessage = `Your WhatsApp quality rating changed to ${newRating}.`;

                            if (newRating === 'RED') {
                                notifType    = 'Error';
                                notifTitle   = '🚨 Quality Rating Dropped to RED';
                                notifMessage = 'Your WhatsApp quality rating dropped to RED due to high block/report rates. Pause broadcast campaigns immediately and resume after 5–7 days of no bulk sends.';
                            } else if (newRating === 'YELLOW') {
                                notifType    = 'Warning';
                                notifTitle   = '⚠️ Quality Rating Dropped to YELLOW';
                                notifMessage = 'Your WhatsApp quality rating is now YELLOW. Reduce campaign volume and ensure all marketing templates include an opt-out button to prevent further drops.';
                            } else if (newRating === 'GREEN' && prevRating && prevRating !== 'GREEN') {
                                notifType    = 'Success';
                                notifTitle   = '✅ Quality Rating Restored to GREEN';
                                notifMessage = 'Great news! Your WhatsApp quality rating recovered to GREEN. You can safely resume normal campaign volume.';
                            }

                            await SystemNotification.create({
                                recipient: user.email,
                                type: notifType,
                                title: notifTitle,
                                message: notifMessage,
                                target: `User: ${user.email}`,
                                status: 'Sent'
                            });

                            getIo().to(userId).emit('notification_update');
                            getIo().to(userId).emit('quality_rating_update', { newRating, prevRating });
                        }
                    } catch (err) {
                        console.error('[WEBHOOK ERROR] Failed to handle quality rating update:', err.message);
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

                        // --- Auto-mark Contact as 'Not on WhatsApp' on Meta error 131026 ---
                        if (rawStatus === 'failed' && statusUpdate.errors && statusUpdate.errors.length > 0) {
                            const errCode = statusUpdate.errors[0].code;
                            // 131026 = Message undeliverable - recipient is not a WhatsApp user
                            if (errCode === 131026) {
                                try {
                                    const updatedCount = await Contact.update(
                                        { status: 'Not on WhatsApp' },
                                        { where: { phone: statusUpdate.recipient_id, userId: userId } }
                                    );
                                    if (updatedCount[0] > 0) {
                                        console.log(`[WEBHOOK] Contact ${statusUpdate.recipient_id} marked as "Not on WhatsApp" due to Meta error 131026`);
                                    }
                                } catch (err) {
                                    console.error('[WEBHOOK ERROR] Failed to mark contact as Not on WhatsApp:', err.message);
                                }
                            }
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

                        // ─── CTWA: Extract referral data from Meta Ad clicks ───
                        // Meta attaches a `referral` object when a customer messages via a WhatsApp Ad
                        const referralData = message.referral ? {
                            source_id: message.referral.source_id,       // The Facebook Ad ID
                            source_url: message.referral.source_url,     // URL of the ad creative
                            source_type: message.referral.source_type,   // 'ad', 'post', etc.
                            headline: message.referral.headline,          // Ad headline text
                            body: message.referral.body,                  // Ad body text
                            media_type: message.referral.media_type,      // 'image', 'video'
                            image_url: message.referral.image_url,        // Ad image URL
                            ctwa_clid: message.referral.ctwa_clid,        // Click tracking ID
                        } : null;

                        if (referralData) {
                            console.log(`[WEBHOOK][CTWA] Ad referral detected! Ad ID: ${referralData.source_id} | Headline: "${referralData.headline}"`);
                            // Phase 5: Auto-fire CAPI Lead event
                            fireCapiEvent(user.id, 'Lead', {
                                ph: [require('crypto').createHash('sha256').update(senderNumber).digest('hex')]
                            }).catch(() => {});
                        }

                        let messageType = message.type;
                        let messageBody = '';
                        let downloadedMediaUrl = null;

                        // --- DOWNLOAD INCOMING MEDIA ---
                        if (['image', 'document', 'audio', 'video', 'sticker'].includes(messageType)) {
                            try {
                                const mediaObj = message[messageType];
                                if (mediaObj && mediaObj.id && foundSettings && foundSettings.metaAccessToken) {
                                    console.log(`[WEBHOOK] Downloading ${messageType} media ID: ${mediaObj.id}`);
                                    
                                    // 1. Get Media URL from Meta
                                    const mediaUrlRes = await axios.get(`https://graph.facebook.com/v22.0/${mediaObj.id}`, {
                                        headers: { 'Authorization': `Bearer ${foundSettings.metaAccessToken}` }
                                    });
                                    
                                    if (mediaUrlRes.data && mediaUrlRes.data.url) {
                                        const metaMediaUrl = mediaUrlRes.data.url;
                                        
                                        // 2. Download Binary Data
                                        const fileRes = await axios.get(metaMediaUrl, {
                                            headers: { 'Authorization': `Bearer ${foundSettings.metaAccessToken}` },
                                            responseType: 'arraybuffer'
                                        });
                                        
                                        // 3. Process, compress, and save (R2/S3/Local) + add to Media Manager
                                        let mimeToUse = mediaObj.mime_type || 'application/octet-stream';
                                        let ext = 'bin';
                                        if (mimeToUse.includes('pdf')) ext = 'pdf';
                                        else if (mimeToUse.includes('png')) ext = 'png';
                                        else if (mimeToUse.includes('jpeg') || mimeToUse.includes('jpg')) ext = 'jpg';
                                        else if (mimeToUse.includes('mp4')) ext = 'mp4';
                                        else if (mimeToUse.includes('ogg')) ext = 'ogg';
                                        else if (mimeToUse.includes('webp')) ext = 'webp';
                                        else if (mimeToUse.includes('msword')) ext = 'doc';
                                        else if (mimeToUse.includes('openxmlformats')) ext = 'docx';

                                        const fileName = `whatsapp_inbox_${messageId.replace(/[^a-zA-Z0-9]/g, '')}.${ext}`;
                                        
                                        downloadedMediaUrl = await processAndStoreBuffer(
                                            Buffer.from(fileRes.data, 'binary'),
                                            fileName,
                                            mimeToUse,
                                            'whatsapp_inbox',
                                            userId,
                                            { 
                                                convertToWebp: false, // Do not convert incoming images to WebP
                                                registerMedia: true, // Show in Media Manager!
                                                mediaSource: 'whatsapp_inbox'
                                            }
                                        );
                                        
                                        console.log(`[WEBHOOK] Successfully processed and stored ${messageType} to ${downloadedMediaUrl}`);
                                    }
                                }
                            } catch (err) {
                                console.error(`[WEBHOOK ERROR] Failed to download media:`, err.response?.data || err.message);
                            }
                        }

                        switch (messageType) {
                            case 'text':
                                messageBody = message.text.body;
                                break;
                            case 'image':
                                messageBody = downloadedMediaUrl ? '📸 Image Received' : '📸 Image Attachment';
                                break;
                            case 'document':
                                messageBody = downloadedMediaUrl ? (message.document?.filename || '📄 Document Received') : '📄 Document Attachment';
                                break;
                            case 'audio':
                                messageBody = downloadedMediaUrl ? '🎤 Audio Received' : '🎤 Audio Message';
                                break;
                            case 'video':
                                messageBody = downloadedMediaUrl ? '🎥 Video Received' : '🎥 Video Message';
                                break;
                            case 'sticker':
                                messageBody = downloadedMediaUrl ? '🖼️ Sticker Received' : '🖼️ Sticker Attachment';
                                break;
                            case 'button':
                                messageBody = message.button.text;
                                break;
                            case 'location':
                                const loc = message.location || {};
                                messageBody = `📍 Location: ${loc.latitude || 0}, ${loc.longitude || 0}${loc.name ? ' — ' + loc.name : ''}${loc.address ? ' (' + loc.address + ')' : ''}`;
                                break;
                            case 'interactive':
                                const interactive = message.interactive || {};
                                if (interactive.type === 'button_reply') {
                                    messageBody = interactive.button_reply?.title || '';
                                } else if (interactive.type === 'list_reply') {
                                    messageBody = interactive.list_reply?.title || '';
                                }
                                break;
                            default:
                                messageBody = `[${messageType}]`;
                                messageType = 'unknown';
                        }

                        console.log(`[WEBHOOK] Incoming message from ${contactWaId}: "${messageBody}"`);

                        // ─── OPT-OUT / OPT-IN DETECTION ─────────────────────────────────────────
                        // Industry-standard keywords (STOP/UNSUBSCRIBE/CANCEL/END/QUIT)
                        // Also catches Meta's mandatory "Stop promotions" marketing opt-out button
                        {
                            const OPT_OUT_KEYWORDS = ['stop', 'unsubscribe', 'cancel', 'end', 'quit'];
                            const OPT_IN_KEYWORDS  = ['start', 'subscribe'];
                            const META_OPTOUT_BUTTON = 'stop promotions'; // Meta's built-in marketing opt-out

                            const normalizedBody = (messageBody || '').trim().toLowerCase();
                            const isOptOut = OPT_OUT_KEYWORDS.includes(normalizedBody) || normalizedBody === META_OPTOUT_BUTTON;
                            const isOptIn  = OPT_IN_KEYWORDS.includes(normalizedBody);

                            const optSettings = foundSettings || (await Settings.findOne({ where: { userId } }));
                            const optOutEnabled = optSettings?.whatsappAutomations?.optOutEnabled !== false; // default true

                            // ── Custom multilingual opt-out keywords (e.g. "रुको", "arret") ──────────
                            // MUST be resolved BEFORE the main gate so they are first-class opt-outs
                            const customOptOutKw = (optSettings?.whatsappAutomations?.customOptOutKeywords || [])
                                .map(k => (k || '').trim().toLowerCase())
                                .filter(Boolean);
                            const isCustomOptOut = !isOptOut && !isOptIn && customOptOutKw.includes(normalizedBody);
                            // ────────────────────────────────────────────────────────────────────────

                            if (optOutEnabled && (isOptOut || isOptIn || isCustomOptOut)) {
                                try {
                                    const contactToUpdate = await Contact.findOne({ where: { phone: contactWaId, userId } });
                                    const effectiveIsOptOut = isOptOut || isCustomOptOut;
                                    const newStatus = effectiveIsOptOut ? 'Opted Out' : 'Active';

                                    if (contactToUpdate) {
                                        await contactToUpdate.update({ status: newStatus });
                                        console.log(`[WEBHOOK][OPT] Contact ${contactWaId} → '${newStatus}' (keyword: "${normalizedBody}"${isCustomOptOut ? ' [custom]' : ''})`);

                                        // TRACK CAMPAIGN OPT-OUTS
                                        if (effectiveIsOptOut) {
                                            const outboundContextId = message.context?.id;
                                            if (outboundContextId) {
                                                try {
                                                    const MessageLog = require('../models/MessageLog');
                                                    const outboundLog = await MessageLog.findOne({ where: { messageId: outboundContextId } });
                                                    if (outboundLog && outboundLog.campaignId) {
                                                        const Message = require('../models/Message');
                                                        await Message.increment('optOutCount', { by: 1, where: { id: outboundLog.campaignId } });
                                                        console.log(`[WEBHOOK][OPT] Incremented optOutCount for campaign ${outboundLog.campaignId}`);
                                                    }
                                                } catch (trackErr) {
                                                    console.error('[WEBHOOK][OPT] Failed to track campaign opt-out count:', trackErr.message);
                                                }
                                            }
                                        }
                                    }

                                    // Send acknowledgement reply using the free 24h conversation window (no template credits used)
                                    if (optSettings?.metaAccessToken && optSettings?.metaPhoneNumberId) {
                                        const automations = optSettings.whatsappAutomations || {};
                                        const defaultOptOutAck = "You've been unsubscribed from our messages. Reply START to re-subscribe at any time.";
                                        const defaultOptInAck  = "You've been re-subscribed! You'll receive our messages again. Reply STOP at any time to opt out.";
                                        const ackText = effectiveIsOptOut
                                            ? (automations.optOutAck || defaultOptOutAck)
                                            : (automations.optInAck  || defaultOptInAck);

                                        await axios.post(
                                            `https://graph.facebook.com/v22.0/${optSettings.metaPhoneNumberId}/messages`,
                                            {
                                                messaging_product: 'whatsapp',
                                                to: contactWaId,
                                                type: 'text',
                                                text: { body: ackText }
                                            },
                                            { headers: { Authorization: `Bearer ${optSettings.metaAccessToken}`, 'Content-Type': 'application/json' } }
                                        );
                                        console.log(`[WEBHOOK][OPT] Ack sent to ${contactWaId}: "${ackText.substring(0, 60)}..."`);
                                    }
                                } catch (optErr) {
                                    console.error('[WEBHOOK][OPT] Opt-out/in handling failed (non-fatal):', optErr.message);
                                }
                                // Skip ALL further processing (FlowBot, auto-reply, etc.) for opt-out/opt-in messages
                                continue;
                            }
                        }
                        // --- TRACK CAMPAIGN BUTTON CLICKS ---
                        const outboundContextId = message.context?.id || null;
                        if (outboundContextId && (messageType === 'button' || messageType === 'interactive')) {
                            try {
                                const outboundLog = await MessageLog.findOne({ where: { messageId: outboundContextId } });
                                if (outboundLog) {
                                    console.log(`[WEBHOOK] Button click detected for outbound log ${outboundLog.id}. Button: ${messageBody}`);
                                    outboundLog.status = 'CLICKED';
                                    outboundLog.clickedButton = messageBody;
                                    await outboundLog.save();
                                }
                            } catch (err) {
                                console.error('[WEBHOOK ERROR] Failed to update MessageLog on button click:', err.message);
                            }
                        }

                        // Find or create Conversation
                        let conversation = await Conversation.findOne({
                            where: { phoneNumber: contactWaId, userId }
                        });

                        let isNewConversationWindow = false;

                        if (!conversation) {
                            isNewConversationWindow = true;
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
                            const lastInbound = new Date(conversation.lastInboundMessageAt).getTime();
                            if (timestamp - lastInbound > 24 * 60 * 60 * 1000) {
                                isNewConversationWindow = true;
                            }
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
                                mediaUrl: downloadedMediaUrl,
                                timestamp: new Date(timestamp),
                                referral: referralData // CTWA: store ad referral data on the message
                            }
                        });

                        if (created) {
                            console.log(`[WEBHOOK] Message saved. Emitting new_message to owner room: ${userId} and team room: team_${userId}`);
                            try {
                                const io = getIo();
                                // Emit to the owner's personal room (joined via join_waba / join_personal)
                                io.to(userId).emit('new_message', {
                                    conversation,
                                    message: chatMessage
                                });
                                // Also emit to the team room so sub-members using join_waba with their own userId
                                // can still receive the event (they join team_${parentId} via user_connected)
                                io.to(`team_${userId}`).emit('new_message', {
                                    conversation,
                                    message: chatMessage
                                });
                            } catch (e) {
                                console.error('[WEBHOOK ERROR] Socket emit failed:', e.message);
                            }

                            // ------ CHECK MONTHLY LIMITS ------
                            let isLimitHit = false;
                            try {
                                const limits = await getUserPlanLimits(userId);
                                if (limits.messageLimit !== -1) {
                                    const user = await User.findByPk(userId);
                                    // Add topup messages if they exist
                                    const totalLimit = limits.messageLimit + (user?.extraTopupMessages || 0);
                                    const sentThisMonth = await getMonthlyMessageCount(userId);
                                    if (sentThisMonth >= totalLimit) {
                                        isLimitHit = true;
                                        console.log(`[WEBHOOK] User ${userId} hit message limit (${sentThisMonth}/${totalLimit}). Bot actions blocked.`);
                                        // Optional: Notify the user they hit the limit (throttle this so we don't spam them per-message)
                                        // A real impl might check if a notification was sent recently
                                    }
                                }
                            } catch (limErr) {
                                console.error('[WEBHOOK ERROR] Failed to check limits:', limErr);
                            }

                            // ------ FLOWBOT EXECUTION LOGIC START ------
                            let flowHandled = false;
                            try {
                                const settings = await Settings.findOne({ where: { userId } });
                                if (!isLimitHit && settings && settings.metaAccessToken && settings.metaPhoneNumberId) {
                                    
                                    // 0. Check for EXACT trigger keyword match to auto-unpause bot
                                    let exactKeywordFlow = null;
                                    if (messageType === 'text' || messageType === 'button' || messageType === 'interactive') {
                                        const incomingText = (messageBody || '').trim().toLowerCase();
                                        exactKeywordFlow = await Flow.findOne({
                                            where: { 
                                                userId, 
                                                isActive: true, 
                                                // Case-insensitive query using LOWER
                                                [Sequelize.Op.and]: [
                                                    Sequelize.where(Sequelize.fn('LOWER', Sequelize.col('triggerKeyword')), incomingText)
                                                ]
                                            }
                                        });
                                    }

                                    if (exactKeywordFlow && conversation.botStatus === 'paused') {
                                        console.log(`[WEBHOOK] Exact keyword "${messageBody}" matched. Re-enabling bot.`);
                                        conversation.botStatus = 'active';
                                        await conversation.save();
                                        
                                        // Emit socket update to sync frontend UI
                                        try {
                                            getIo().to(userId).emit('conversation_bot_update', {
                                                conversationId: conversation.id,
                                                botStatus: 'active'
                                            });
                                        } catch (e) {}
                                    }

                                    if (conversation.botStatus !== 'paused') {
                                        // 1. Ensure we have the Contact
                                        let contact = await Contact.findOne({ where: { phone: contactWaId, userId } });
                                        if (!contact) {
                                            // New contact messaging us — they're definitively on WhatsApp → 'Active'
                                            contact = await Contact.create({
                                                phone: contactWaId,
                                                name: contactName,
                                                userId,
                                                status: 'Active', // Inbound message proves they're on WhatsApp
                                                // CTWA: stamp the ad source on the contact's first touch
                                                ctwaSource: referralData || null
                                            });
                                        } else if (contact.status !== 'Active') {
                                            // Existing contact who messaged us — upgrade to 'Active'
                                            // (e.g., was 'New' or even 'Not on WhatsApp' but now proving they are on WA)
                                            try {
                                                await contact.update({ status: 'Active' });
                                            } catch (statusErr) {
                                                console.error('[WEBHOOK] Failed to upgrade contact status to Active:', statusErr.message);
                                            }
                                        }

                                        // ── AUTO-TAGGING: only for brand-new contacts ──
                                        if (contact.isNewRecord) {
                                            applyAutoTags(contact, messageBody, true, referralData).catch(() => {});

                                            if (referralData) {
                                                console.log(`[WEBHOOK][CTWA] New contact ${contactWaId} attributed to Ad ID: ${referralData.source_id}`);

                                                // ── CTWA AUTO-REPLY: Fire instant welcome message within the 72h free window ──
                                                try {
                                                    const ctwaTemplate = settings?.ctwaAutoReplyTemplate;
                                                    if (ctwaTemplate && ctwaTemplate.enabled && ctwaTemplate.templateName && settings.metaAccessToken && settings.metaPhoneNumberId) {
                                                        console.log(`[WEBHOOK][CTWA] Firing auto-reply template: "${ctwaTemplate.templateName}" to ${contactWaId}`);

                                                        const templateComponents = [];
                                                        if (ctwaTemplate.injectName) {
                                                            templateComponents.push({
                                                                type: 'body',
                                                                parameters: [{ type: 'text', text: contactName || 'there' }]
                                                            });
                                                        }

                                                        const ctwaAutoReplyPayload = {
                                                            messaging_product: 'whatsapp',
                                                            to: contactWaId,
                                                            type: 'template',
                                                            template: {
                                                                name: ctwaTemplate.templateName,
                                                                language: { code: ctwaTemplate.language || 'en' },
                                                                ...(templateComponents.length > 0 ? { components: templateComponents } : {})
                                                            }
                                                        };

                                                        const autoReplyRes = await axios.post(
                                                            `https://graph.facebook.com/v22.0/${settings.metaPhoneNumberId}/messages`,
                                                            ctwaAutoReplyPayload,
                                                            { headers: { Authorization: `Bearer ${settings.metaAccessToken}`, 'Content-Type': 'application/json' } }
                                                        );

                                                        console.log(`[WEBHOOK][CTWA] Auto-reply sent. Message ID: ${autoReplyRes.data?.messages?.[0]?.id}`);
                                                    }
                                                } catch (ctwaAutoErr) {
                                                    console.error('[WEBHOOK][CTWA] Auto-reply failed (non-critical):', ctwaAutoErr.response?.data?.error?.message || ctwaAutoErr.message);
                                                }
                                            }
                                        }

                                    const runner = new FlowRunner(settings, conversation, userId, 'keyword');

                                    // 2. Check if user is PAUSED in an active flow (waiting for a button click)
                                    const activeState = await ContactFlowState.findOne({ where: { contactId: contact.id } });
                                    
                                    if (activeState) {
                                        console.log(`[WEBHOOK] Contact is in active flow state. FlowID: ${activeState.flowId}, NodeID: ${activeState.currentNodeId}`);
                                        const flow = await Flow.findOne({ where: { id: activeState.flowId, isActive: true } });
                                        
                                        if (flow) {
                                            // Find the paused node to check its type
                                            const pausedNode = flow.nodes.find(n => n.id === activeState.currentNodeId);
                                            
                                            // If paused on a locationNode, only resume when we receive a location message
                                            if (pausedNode && pausedNode.type === 'locationNode') {
                                                if (messageType === 'location') {
                                                    const loc = message.location || {};
                                                    // Store location data in flow variables for downstream nodes
                                                    const vars = { ...(activeState.variables || {}), 
                                                        last_location_lat: loc.latitude || 0, 
                                                        last_location_lng: loc.longitude || 0,
                                                        last_location_name: loc.name || '',
                                                        last_location_address: loc.address || ''
                                                    };
                                                    activeState.variables = vars;
                                                    await activeState.save();

                                                    const outgoingEdges = flow.edges.filter(e => e.source === activeState.currentNodeId);
                                                    if (outgoingEdges.length > 0) {
                                                        const nextNodeId = outgoingEdges[0].target;
                                                        flowHandled = true;
                                                        await runner.executeFlow(flow, contact.id, nextNodeId);
                                                    }
                                                } else {
                                                    // User sent something other than location — remind them
                                                    flowHandled = true; // Don't trigger other flows
                                                    const reminderText = pausedNode.data?.text || 'Please share your location to continue.';
                                                    await runner.sendWhatsAppLocationRequest(reminderText);
                                                }
                                            } else if (pausedNode && ['inputTextNode', 'inputDateNode', 'inputNumberNode'].includes(pausedNode.type)) {
                                                if (messageType === 'text') {
                                                    const textVal = messageBody.trim();
                                                    let isValid = true;
                                                    
                                                    if (pausedNode.type === 'inputNumberNode') {
                                                        const isNum = /^\d+$/.test(textVal);
                                                        const exactLength = pausedNode.data?.exactLength;
                                                        
                                                        if (!isNum) {
                                                            flowHandled = true;
                                                            isValid = false;
                                                            await runner.sendWhatsAppText('Please enter a valid number.');
                                                        } else if (exactLength && textVal.length !== exactLength) {
                                                            flowHandled = true;
                                                            isValid = false;
                                                            await runner.sendWhatsAppText(`Please enter exactly ${exactLength} digits.`);
                                                        }
                                                    }
                                                    
                                                    if (isValid) {
                                                        const vars = { ...(activeState.variables || {}) };
                                                        if (pausedNode.data?.variable) {
                                                            vars[pausedNode.data.variable] = textVal;
                                                        }
                                                        activeState.variables = vars;
                                                        await activeState.save();
                                                        
                                                        const outgoingEdges = flow.edges.filter(e => e.source === activeState.currentNodeId);
                                                        if (outgoingEdges.length > 0) {
                                                            const nextNodeId = outgoingEdges[0].target;
                                                            flowHandled = true;
                                                            await runner.executeFlow(flow, contact.id, nextNodeId);
                                                        }
                                                    }
                                                } else {
                                                    flowHandled = true;
                                                    await runner.sendWhatsAppText('Please reply with text to continue.');
                                                }
                                            } else if (pausedNode && pausedNode.type === 'aiNode') {
                                                // AI Node: re-execute the SAME node so Gemini gets the new message
                                                flowHandled = true;
                                                // Don't clear state — the AI node will re-save it after responding
                                                await runner.executeFlow(flow, contact.id, pausedNode.id);
                                            } else if (pausedNode && pausedNode.type === 'listNode') {
                                                // List Node: user made a selection from the interactive list
                                                if (messageType === 'interactive') {
                                                    // Extract the raw row ID from the WhatsApp payload (e.g. "row_2")
                                                    // The edge sourceHandle uses a dash format (e.g. "row-2"), so convert
                                                    const rawRowId = message.interactive?.list_reply?.id || '';
                                                    const sourceHandleId = rawRowId.replace('row_', 'row-');
                                                    const selectedTitle = messageBody.trim();

                                                    // Save the selected option text to the configured variable
                                                    const vars = { ...(activeState.variables || {}) };
                                                    if (pausedNode.data?.variable) {
                                                        vars[pausedNode.data.variable] = selectedTitle;
                                                    }
                                                    activeState.variables = vars;
                                                    await activeState.save();

                                                    // Find the edge that matches the selected row's sourceHandle
                                                    const allOutgoingEdges = flow.edges.filter(e => e.source === activeState.currentNodeId);
                                                    const matchedEdge = allOutgoingEdges.find(e => e.sourceHandle === sourceHandleId)
                                                                     || allOutgoingEdges[0]; // fallback to first edge

                                                    if (matchedEdge) {
                                                        const nextNodeId = matchedEdge.target;
                                                        flowHandled = true;
                                                        await runner.executeFlow(flow, contact.id, nextNodeId);
                                                    }
                                                } else {
                                                    // User sent something other than a list selection — re-send the list
                                                    flowHandled = true;
                                                    const sections = pausedNode.data?.sections || [];
                                                    const rows = sections[0]?.rows || [];
                                                    const title = pausedNode.data?.title || 'Select an Option';
                                                    const bodyText = pausedNode.data?.text || title;
                                                    if (rows.length > 0) await runner.sendWhatsAppList(bodyText, title, rows);
                                                }
                                            } else if (pausedNode && pausedNode.type === 'interactiveNode') {
                                                // Buttons Node: user clicked one of the 1-3 buttons
                                                if (messageType === 'interactive' && message.interactive?.type === 'button_reply') {
                                                    const rawBtnId = message.interactive?.button_reply?.id || ''; // "btn_0"
                                                    const sourceHandleId = rawBtnId.replace('btn_', 'btn-'); // "btn-0"
                                                    
                                                    const allOutgoingEdges = flow.edges.filter(e => e.source === activeState.currentNodeId);
                                                    const matchedEdge = allOutgoingEdges.find(e => e.sourceHandle === sourceHandleId);

                                                    if (matchedEdge) {
                                                        const nextNodeId = matchedEdge.target;
                                                        flowHandled = true;
                                                        await runner.executeFlow(flow, contact.id, nextNodeId);
                                                    }
                                                } else {
                                                    // User sent text instead of clicking a button — re-send the buttons
                                                    flowHandled = true;
                                                    const interpolatedText = await runner.interpolate(pausedNode.data?.text || '', contact.id);
                                                    await runner.sendWhatsAppButtons(interpolatedText, pausedNode.data?.buttons || []);
                                                }
                                            } else {
                                                // Generic flow resumption
                                                const outgoingEdges = flow.edges.filter(e => e.source === activeState.currentNodeId);
                                                if (outgoingEdges.length > 0) {
                                                    const nextNodeId = outgoingEdges[0].target;
                                                    flowHandled = true;
                                                    await runner.clearContactState(contact.id);
                                                    await runner.executeFlow(flow, contact.id, nextNodeId);
                                                }
                                            }
                                        } else {
                                            // Flow was disabled or deleted while they were paused
                                            await runner.clearContactState(contact.id);
                                        }
                                    }
                                    
                                    // 2b. Auto-Tag Engine: Evaluate rules against incoming message for existing contacts
                                    // (New contacts are handled inline at creation above)
                                    if (contact && !activeState) {
                                        applyAutoTags(contact, messageBody, false, referralData).catch(() => {});
                                    }

                                    // 3. If not in a running flow, check if message matches any Trigger Keywords
                                    if (!flowHandled && (messageType === 'text' || messageType === 'button' || messageType === 'interactive')) {
                                        const incomingText = messageBody.trim().toLowerCase();
                                        
                                        // Find active flows for this user where triggerKeyword matches OR isAny is true
                                        // Prefer exact keyword matches first
                                        let triggerFlow = await Flow.findOne({
                                            where: { 
                                                userId, 
                                                isActive: true,
                                                // Case-insensitive query using LOWER
                                                [Sequelize.Op.and]: [
                                                    Sequelize.where(Sequelize.fn('LOWER', Sequelize.col('triggerKeyword')), incomingText)
                                                ]
                                            }
                                        });

                                        if (!triggerFlow) {
                                            // Check 'isAny' trigger
                                            triggerFlow = await Flow.findOne({
                                                where: { userId, isActive: true, isAny: true }
                                            });
                                        }

                                        if (triggerFlow) {
                                            console.log(`[WEBHOOK] Trigger matched Flow: ${triggerFlow.name}`);
                                            flowHandled = true;
                                            // Create a new runner with the correct triggerType
                                            const matchedTriggerType = triggerFlow.isAny ? 'any' : 'keyword';
                                            const triggerRunner = new FlowRunner(settings, conversation, userId, matchedTriggerType);
                                            await triggerRunner.executeFlow(triggerFlow, contact.id, null);
                                        }
                                    }
                                    } // Close: if (conversation.botStatus !== 'paused')
                                }
                            } catch (flowErr) {
                                console.error('[WEBHOOK ERROR] FlowBot execution failed:', flowErr.message || flowErr);
                                if (flowErr.sql) console.error('[WEBHOOK ERROR] SQL Query involved:', flowErr.sql);
                            }
                            // ------ FLOWBOT EXECUTION LOGIC END ------

                            // ------ AUTO-REPLY LOGIC START ------
                            if (!isLimitHit && !flowHandled && isNewConversationWindow) {
                                try {
                                    const settings = await Settings.findOne({ where: { userId } });
                                    if (settings && settings.metaAccessToken && settings.metaPhoneNumberId && settings.whatsappAutomations) {
                                        let replyText = null;
                                        const { welcomeMessage, offHoursMessage } = settings.whatsappAutomations;

                                        // Check Off-Hours first
                                        if (offHoursMessage?.enabled && offHoursMessage.text && Array.isArray(offHoursMessage.schedule)) {
                                            try {
                                                const userTime = new Date().toLocaleString("en-US", { timeZone: offHoursMessage.timezone || 'UTC' });
                                                const userDate = new Date(userTime);
                                                const currDay = userDate.getDay();
                                                const currHour = userDate.getHours();
                                                const currMin = userDate.getMinutes();

                                                const daySchedule = offHoursMessage.schedule.find(s => s.day === currDay);
                                                let isOffHours = true;
                                                // If enabled, it means there are business hours today
                                                if (daySchedule && daySchedule.enabled) {
                                                    const [startH, startM] = (daySchedule.startTime || '09:00').split(':').map(Number);
                                                    const [endH, endM] = (daySchedule.endTime || '17:00').split(':').map(Number);
                                                    const currentMins = currHour * 60 + currMin;
                                                    const startMins = startH * 60 + startM;
                                                    const endMins = endH * 60 + endM;
                                                    if (currentMins >= startMins && currentMins <= endMins) {
                                                        isOffHours = false;
                                                    }
                                                }

                                                if (isOffHours) {
                                                    replyText = offHoursMessage.text;
                                                }
                                                } catch (e) {
                                                    console.error('[WEBHOOK] Error calculating off-hours:', e);
                                                }
                                            }

                                            // If not off-hours (or off-hours disabled), check Welcome Message
                                            if (!replyText && welcomeMessage?.enabled && welcomeMessage.text) {
                                                replyText = welcomeMessage.text;
                                            }

                                        if (replyText) {
                                            console.log(`[WEBHOOK] Sending Auto-Reply to ${contactWaId}`);
                                            const metaPayload = {
                                                messaging_product: "whatsapp",
                                                recipient_type: "individual",
                                                to: contactWaId,
                                                type: "text",
                                                text: { preview_url: false, body: replyText }
                                            };

                                            // Make asynchronous call
                                            fetch(`https://graph.facebook.com/v21.0/${settings.metaPhoneNumberId}/messages`, {
                                                method: 'POST',
                                                headers: {
                                                    'Authorization': `Bearer ${settings.metaAccessToken}`,
                                                    'Content-Type': 'application/json'
                                                },
                                                body: JSON.stringify(metaPayload)
                                            }).then(res => res.json()).then(async metaRes => {
                                                if (metaRes.messages && metaRes.messages.length > 0) {
                                                    const outMsg = await ChatMessage.create({
                                                        conversationId: conversation.id,
                                                        messageId: metaRes.messages[0].id,
                                                        direction: 'OUTBOUND',
                                                        type: 'text',
                                                        body: replyText,
                                                        status: 'sent',
                                                        timestamp: new Date()
                                                    });
                                                    conversation.lastMessage = replyText;
                                                    conversation.lastMessageAt = new Date();
                                                    await conversation.save();

                                                    // Tell frontend an automated outbound message was sent
                                                    getIo().to(userId).emit('new_message', { conversation, message: outMsg });
                                                } else {
                                                    console.error('[WEBHOOK] Auto-reply failed in Meta Graph API:', metaRes);
                                                }
                                            }).catch(err => console.error('[WEBHOOK] Auto-reply send promise failed:', err));
                                        }
                                    }
                                } catch (autoReplyErr) {
                                    console.error('[WEBHOOK ERROR] Auto-reply failure:', autoReplyErr);
                                }
                            }
                            // ------ AUTO-REPLY LOGIC END ------

                            // ------ PLUGIN HOOK: AI CHATBOT (Ongoing Chat Run) ------
                            try {
                                const settings = await Settings.findOne({ where: { userId } });
                                if (!isLimitHit && !flowHandled && conversation.botStatus !== 'paused' && settings && settings.metaAccessToken && settings.metaPhoneNumberId && settings.whatsappAutomations) {
                                    
                                    // Check if user has ai_bot active
                                    let aiReplyText = null;
                                    const addon = await Addon.findOne({ where: { module_key: 'ai_bot', isActive: true } });
                                    if (addon) {
                                        const userAddon = await UserAddon.findOne({ where: { userId, addonId: addon.id, status: 'active' } });
                                        const isAddonExpired = userAddon?.currentPeriodEnd && new Date(userAddon.currentPeriodEnd) < new Date();
                                        if (userAddon && !isAddonExpired) {
                                            const aiBotPluginPath = path.join(__dirname, '../plugins/addon_ai_bot/index.js');
                                            if (fs.existsSync(aiBotPluginPath)) {
                                                const aiBot = require(aiBotPluginPath); // correct requiring
                                                if (typeof aiBot.processMessage === 'function') {
                                                    const aiResponse = await aiBot.processMessage(messageBody, userId, conversation.id, userAddon.config || {}, settings);
                                                    if (aiResponse) {
                                                        aiReplyText = aiResponse;
                                                    }
                                                }
                                            }
                                        }
                                    }

                                    if (aiReplyText) {
                                        console.log(`[WEBHOOK-AI] Sending AI Reply to ${contactWaId}`);
                                        const metaPayload = {
                                            messaging_product: "whatsapp",
                                            recipient_type: "individual",
                                            to: contactWaId,
                                            type: "text",
                                            text: { preview_url: false, body: aiReplyText }
                                        };

                                        fetch(`https://graph.facebook.com/v21.0/${settings.metaPhoneNumberId}/messages`, {
                                            method: 'POST',
                                            headers: {
                                                'Authorization': `Bearer ${settings.metaAccessToken}`,
                                                'Content-Type': 'application/json'
                                            },
                                            body: JSON.stringify(metaPayload)
                                        }).then(res => res.json()).then(async metaRes => {
                                            if (metaRes.messages && metaRes.messages.length > 0) {
                                                const outMsg = await ChatMessage.create({
                                                    conversationId: conversation.id,
                                                    messageId: metaRes.messages[0].id,
                                                    direction: 'OUTBOUND',
                                                    type: 'text',
                                                    body: aiReplyText,
                                                    status: 'sent',
                                                    timestamp: new Date()
                                                });
                                                conversation.lastMessage = aiReplyText;
                                                conversation.lastMessageAt = new Date();
                                                await conversation.save();

                                                getIo().to(userId).emit('new_message', { conversation, message: outMsg });
                                            } else {
                                                console.error('[WEBHOOK-AI] Auto-reply failed in Meta API:', metaRes);
                                            }
                                        }).catch(err => console.error('[WEBHOOK-AI] Auto-reply fetch error:', err));
                                    }
                                }
                            } catch (aiErr) {
                                console.error('[WEBHOOK ERROR] AI Bot Add-on Hook failed:', aiErr);
                            }
                            // ----------------------------------------
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
