const pLimit = require('p-limit');
const Message = require('../models/Message');
const MessageLog = require('../models/MessageLog');
const Contact = require('../models/Contact');
const Template = require('../models/Template');
const Settings = require('../models/Settings');
const Conversation = require('../models/Conversation');
const ChatMessage = require('../models/ChatMessage');
const { getIo } = require('../socket');
const { getUserPlanLimits, checkLimit, getMonthlyMessageCount } = require('../utils/planLimits');

const processCampaign = async (campaignId) => {
    try {
        console.log(`Starting processing for campaign ${campaignId}`);
        const message = await Message.findByPk(campaignId);
        if (!message) throw new Error('Campaign not found');

        const userId = message.userId;
        const settings = await Settings.findOne({ where: { userId } });

        if (!settings || !settings.metaPhoneNumberId || !settings.metaAccessToken) {
            console.error(`Settings missing for user ${userId}`);
            await message.update({ status: 'FAILED' });
            return;
        }

        const template = await Template.findByPk(message.templateId);
        if (!template) {
            console.error(`Template ${message.templateId} not found`);
            await message.update({ status: 'FAILED' });
            return;
        }

        // Re-construct Recipients
        const { contactIds, manualRecipients, params } = message.targetConfig || {};

        let contacts = [];
        if (contactIds === 'all') {
            contacts = await Contact.findAll({
                where: { userId, status: { [require('sequelize').Op.or]: [{ [require('sequelize').Op.ne]: 'Invalid' }, { [require('sequelize').Op.is]: null }] } },
                attributes: ['id', 'name', 'phone', 'email', 'tags'],
                raw: true
            });
        } else if (Array.isArray(contactIds) && contactIds.length > 0) {
            contacts = await Contact.findAll({
                where: { id: contactIds, userId, status: { [require('sequelize').Op.or]: [{ [require('sequelize').Op.ne]: 'Invalid' }, { [require('sequelize').Op.is]: null }] } },
                attributes: ['id', 'name', 'phone', 'email', 'tags'],
                raw: true
            });
        }

        let adHoc = [];
        if (Array.isArray(manualRecipients) && manualRecipients.length > 0) {
            adHoc = manualRecipients.map(m => ({
                id: "temp_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
                name: m.name || 'Guest',
                phone: m.phone,
                isTemp: true
            }));
        }

        const allTargets = [...contacts, ...adHoc];
        if (allTargets.length === 0) {
            console.log("No recipients found for campaign " + campaignId);
            await message.update({ status: 'COMPLETED' }); // Nothing to do
            return;
        }

        // --- Check message limit BEFORE sending ---
        const limits = await getUserPlanLimits(userId);
        const sentThisMonth = await getMonthlyMessageCount(userId);
        const projectedTotal = sentThisMonth + allTargets.length;
        if (limits.messageLimit !== -1 && projectedTotal > limits.messageLimit) {
            const remaining = Math.max(0, limits.messageLimit - sentThisMonth);
            console.error(`[CAMPAIGN] Message limit would be exceeded for user ${userId}. Limit: ${limits.messageLimit}, Sent: ${sentThisMonth}, Campaign needs: ${allTargets.length}, Remaining: ${remaining}`);
            await message.update({
                status: 'FAILED',
                errorMessage: `Monthly message limit exceeded. Your plan allows ${limits.messageLimit} messages/month. You've used ${sentThisMonth} and have ${remaining} remaining, but this campaign requires ${allTargets.length}.`
            });
            return;
        }

        // Update status to SENDING if starting now
        await message.update({ status: 'SENDING' });

        // Prepare Variables
        const variableMatches = template.content.match(/\{\{([^}]+)\}\}/g) || [];
        const variables = variableMatches.map(v => v.replace(/\{\{|\}\}/g, ''));
        const userParams = params || {};

        // ── Dynamic field resolver ─────────────────────────────────────────────
        // If a param value starts with "__col__" it means the user picked a
        // contact column. The suffix is the field name. A matching
        // "__fallback__<varName>" key holds the text to use when the field is
        // blank for a given contact.
        const resolveParam = (varName, contact) => {
            const raw = userParams[varName] || '';
            if (!raw.startsWith('__col__')) return raw; // static text — pass through

            const colKey = raw.replace('__col__', '');
            const fallback = userParams[`__fallback__${varName}`] || 'Customer';

            let resolved = '';
            if (colKey === 'name')       resolved = contact.name || '';
            else if (colKey === 'first_name') resolved = (contact.name || '').split(' ')[0] || '';
            else if (colKey === 'phone') resolved = contact.phone || '';
            else if (colKey === 'email') resolved = contact.email || '';
            else if (colKey === 'tags')  resolved = (contact.tags || [])[0] || '';

            return resolved.trim() || fallback;
        };
        // ──────────────────────────────────────────────────────────────────────

        const limit = pLimit(5);

        const CHUNK_SIZE = 100;

        for (let i = 0; i < allTargets.length; i += CHUNK_SIZE) {
            const chunk = allTargets.slice(i, i + CHUNK_SIZE);
            const sendPromises = chunk.map(contact => limit(async () => {
                try {
                    let phone = contact.phone.replace(/\D/g, '');

                    const bodyParameters = variables.map(v => ({
                        type: "text",
                        text: resolveParam(v, contact)
                    }));

                    const payload = {
                        messaging_product: "whatsapp",
                        to: phone,
                        type: "template",
                        template: {
                            name: template.name,
                            language: { code: template.language }
                        }
                    };

                    // Build components based on template archetype
                    if (template.archetype === 'carousel' && Array.isArray(template.cards) && template.cards.length > 0) {
                        // Carousel template: build per-card components
                        const carouselCardComponents = template.cards.map((card, cardIndex) => {
                            const cardComps = [];

                            // Header (image/video media ID)
                            const headerMediaId = userParams[`card_${cardIndex}_headerMediaId`];
                            if (card.headerType && card.headerType !== 'NONE' && headerMediaId) {
                                const mediaType = card.headerType.toLowerCase(); // 'image' or 'video'
                                cardComps.push({
                                    type: 'header',
                                    parameters: [{
                                        type: mediaType,
                                        [mediaType]: { id: headerMediaId }
                                    }]
                                });
                            }

                            // Body variables (only include if there are actual variables)
                            const cardVars = (card.content ? (card.content.match(/\{\{([^}]+)\}\}/g) || []).map(v => v.replace(/\{\{|\}\}/g, '')) : []);
                            if (cardVars.length > 0) {
                                const bodyParams = cardVars.map(varName => {
                                    let value = userParams[`card_${cardIndex}_var_${varName}`] || '';
                                    if (!value && (varName === 'name' || varName.toLowerCase().includes('name'))) {
                                        value = contact.name || 'Customer';
                                    }
                                    return { type: 'text', text: value };
                                });
                                cardComps.push({
                                    type: 'body',
                                    parameters: bodyParams
                                });
                            }

                            // Buttons — index must be a STRING per Meta spec
                            if (card.buttons && card.buttons.length > 0) {
                                card.buttons.forEach((btn, btnIdx) => {
                                    if (btn.type === 'URL') {
                                        const overrideUrl = userParams[`card_${cardIndex}_btn_${btnIdx}_url`];
                                        const buttonComp = {
                                            type: 'button',
                                            sub_type: 'url',
                                            index: String(btnIdx)
                                        };
                                        if (overrideUrl) {
                                            buttonComp.parameters = [{ type: 'text', text: overrideUrl }];
                                        }
                                        cardComps.push(buttonComp);
                                    } else if (btn.type === 'QUICK_REPLY') {
                                        cardComps.push({
                                            type: 'button',
                                            sub_type: 'quick_reply',
                                            index: String(btnIdx),
                                            parameters: [{ type: 'payload', payload: btn.text || 'reply' }]
                                        });
                                    }
                                    // PHONE_NUMBER buttons need no runtime parameters
                                });
                            }

                            return { card_index: cardIndex, components: cardComps };
                        });

                        const components = [];
                        if (bodyParameters.length > 0) {
                            components.push({ type: 'body', parameters: bodyParameters });
                        }
                        components.push({
                            type: 'carousel',
                            cards: carouselCardComponents
                        });
                        payload.template.components = components;

                    } else {
                        // ── Standard template — build all applicable components ──────────────
                        const components = [];

                        // 1. Header component (IMAGE / VIDEO / DOCUMENT)
                        //    The frontend uploads the file and stores the media ID in
                        //    params['headerMediaId']. Documents also carry a filename.
                        const stdHeaderType = (template.headerType || '').toUpperCase();
                        const stdHeaderMediaId = userParams['headerMediaId'];
                        if (stdHeaderMediaId && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(stdHeaderType)) {
                            const mediaType = stdHeaderType.toLowerCase(); // 'image' | 'video' | 'document'
                            const mediaParam = { id: stdHeaderMediaId };
                            if (mediaType === 'document') {
                                // filename is optional but helpful; fall back to template name
                                mediaParam.filename = userParams['headerFilename'] || template.name || 'document';
                            }
                            components.push({
                                type: 'header',
                                parameters: [{ type: mediaType, [mediaType]: mediaParam }]
                            });
                        }

                        // 2. Body component
                        if (bodyParameters.length > 0) {
                            components.push({ type: 'body', parameters: bodyParameters });
                        }

                        // 3. Button components (URL dynamic suffix / QUICK_REPLY payload)
                        if (Array.isArray(template.buttons) && template.buttons.length > 0) {
                            template.buttons.forEach((btn, btnIdx) => {
                                if (btn.type === 'URL') {
                                    // Only include if a dynamic URL suffix was provided
                                    const overrideUrl = userParams[`btn_${btnIdx}_url`];
                                    if (overrideUrl) {
                                        components.push({
                                            type: 'button',
                                            sub_type: 'url',
                                            index: String(btnIdx),
                                            parameters: [{ type: 'text', text: overrideUrl }]
                                        });
                                    }
                                } else if (btn.type === 'QUICK_REPLY') {
                                    components.push({
                                        type: 'button',
                                        sub_type: 'quick_reply',
                                        index: String(btnIdx),
                                        parameters: [{ type: 'payload', payload: btn.text || 'reply' }]
                                    });
                                }
                                // PHONE_NUMBER / COPY_CODE buttons need no runtime parameters
                            });
                        }

                        if (components.length > 0) {
                            payload.template.components = components;
                        }
                    }

                    const metaRes = await fetch(`https://graph.facebook.com/v17.0/${settings.metaPhoneNumberId}/messages`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${settings.metaAccessToken}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(payload)
                    });

                    const data = await metaRes.json();

                    if (!metaRes.ok) {
                        console.error(`[CAMPAIGN] Meta API Error for ${phone}:`, JSON.stringify(data, null, 2));
                        console.error(`[CAMPAIGN] Payload that failed:`, JSON.stringify(payload, null, 2));
                        await MessageLog.create({
                            campaignId: message.id,
                            contactId: contact.isTemp ? null : contact.id,
                            phone: contact.phone,
                            status: 'FAILED',
                            error: data.error?.message || 'Meta API Error'
                        });
                    } else {
                        const sentMessageId = data.messages?.[0]?.id;

                        // 1. Create Log (Analytics)
                        await MessageLog.create({
                            campaignId: message.id,
                            contactId: contact.isTemp ? null : contact.id,
                            phone: contact.phone,
                            status: 'SENT',
                            messageId: sentMessageId,
                            metaTimestamp: Math.floor(Date.now() / 1000).toString()
                        });

                        // 2. Sync to Inbox (Conversation & ChatMessage)
                        try {
                            const now = new Date();
                            // Render full content by replacing variables
                            let fullBody = template.content;
                            variables.forEach(variableName => {
                                const val = resolveParam(variableName, contact);
                                fullBody = fullBody.replace(new RegExp(`\\{\\{${variableName}\\}\\}`, 'g'), val);
                            });

                            // Fallback if no variables found or content is empty
                            if (!fullBody) fullBody = `Template: ${template.name}`;

                            // Find or Create Conversation
                            let conversation = await Conversation.findOne({
                                where: { phoneNumber: phone, userId }
                            });

                            if (!conversation) {
                                conversation = await Conversation.create({
                                    phoneNumber: phone,
                                    contactName: contact.name || 'Unknown',
                                    userId,
                                    lastMessage: fullBody,
                                    lastMessageAt: now,
                                    unreadCount: 0
                                });
                            } else {
                                conversation.lastMessage = fullBody;
                                conversation.lastMessageAt = now;
                                await conversation.save();
                            }

                            // Build rich templateData for Inbox rendering
                            let richTemplateComponents = [];
                            if (template.archetype === 'carousel' && Array.isArray(template.cards) && template.cards.length > 0) {
                                // Add body if exists
                                if (template.content) {
                                    richTemplateComponents.push({ type: 'BODY', text: fullBody });
                                }
                                // Build carousel component with cards in renderer-friendly format
                                richTemplateComponents.push({
                                    type: 'CAROUSEL',
                                    cards: template.cards.map((card, cardIndex) => {
                                        const cardComps = [];
                                        if (card.headerType && card.headerType !== 'NONE') {
                                            const headerComp = { type: 'HEADER', format: card.headerType };
                                            // Attach the locally-stored image URL so the inbox can display it
                                            const localUrl = userParams[`card_${cardIndex}_headerLocalUrl`];
                                            if (localUrl) headerComp.localUrl = localUrl;
                                            cardComps.push(headerComp);
                                        }
                                        if (card.content) {
                                            // Replace variables with actual values
                                            let cardBody = card.content;
                                            const cardVars = (card.content.match(/\{\{([^}]+)\}\}/g) || []).map(v => v.replace(/\{\{|\}\}/g, ''));
                                            cardVars.forEach(varName => {
                                                const cardParamKey = `card_${cardIndex}_var_${varName}`;
                                                const raw = userParams[cardParamKey] || '';
                                                const fallback = userParams[`__fallback__${cardParamKey}`] || varName;
                                                let val = raw;
                                                if (raw.startsWith('__col__')) {
                                                    val = resolveParam(cardParamKey, contact) || fallback;
                                                } else {
                                                    val = raw || fallback;
                                                }
                                                cardBody = cardBody.replace(new RegExp(`\\{\\{${varName}\\}\\}`, 'g'), val);
                                            });
                                            cardComps.push({ type: 'BODY', text: cardBody });
                                        }
                                        if (card.buttons && card.buttons.length > 0) {
                                            cardComps.push({ type: 'BUTTONS', buttons: card.buttons });
                                        }
                                        return { components: cardComps };
                                    })
                                });
                            } else {
                                // Standard template
                                if (template.content) richTemplateComponents.push({ type: 'BODY', text: fullBody });
                                // Add buttons if stored on template
                                if (template.buttons && template.buttons.length > 0) {
                                    richTemplateComponents.push({ type: 'BUTTONS', buttons: template.buttons });
                                }
                            }

                            // Create Chat Message
                            const chatMsg = await ChatMessage.create({
                                conversationId: conversation.id,
                                messageId: sentMessageId,
                                direction: 'OUTBOUND',
                                type: 'template',
                                body: fullBody,
                                templateData: {
                                    name: template.name,
                                    language: template.language,
                                    components: richTemplateComponents
                                },
                                status: 'sent',
                                timestamp: now
                            });

                            // Emit WebSocket to update UI instantly
                            try {
                                getIo().to(userId).emit('new_message', {
                                    conversation: conversation,
                                    message: chatMsg
                                });
                            } catch (wsErr) {
                                console.error('[CAMPAIGN INBOX SYNC] WebSocket emission failed:', wsErr.message);
                            }

                        } catch (inboxErr) {
                            console.error('[CAMPAIGN INBOX SYNC] FAILED for phone:', phone, '| Error:', inboxErr.message, inboxErr.stack);
                            // Don't fail the whole send if inbox sync fails, but log it
                        }
                    }

                } catch (e) {
                    await MessageLog.create({
                        campaignId: message.id,
                        contactId: contact.isTemp ? null : contact.id,
                        phone: contact.phone,
                        status: 'FAILED',
                        error: e.message
                    });
                }
            }));

            await Promise.all(sendPromises);
        }

        await message.update({ status: 'COMPLETED' });
        console.log(`Campaign ${campaignId} completed.`);

    } catch (err) {
        console.error(`Process Campaign Error [${campaignId}]:`, err);
    }
};

module.exports = processCampaign;
