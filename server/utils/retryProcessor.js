/**
 * retryProcessor.js
 *
 * Handles retrying MessageLog entries that have status = 'RETRY_PENDING' and
 * whose retryAfter timestamp has passed.
 *
 * This is triggered by the scheduler (scheduler.js) every 30 minutes.
 *
 * Progressive retry schedule:
 *   Retry 1: fires +8h  after initial failure  (retryCount: 0 → 1, set by webhook.js)
 *   Retry 2: fires +16h after retry 1 fails    (retryCount: 1 → 2)
 *   Retry 3: fires +24h after retry 2 fails    (retryCount: 2 → 3)
 *   After 3 failures: permanently FAILED
 *
 * On success   : log → SENT, inbox + socket updated, contact → Active
 * On 131049    : schedule next retry (if retries remain) or → FAILED
 * On 131026    : contact → "Not on WhatsApp", log → FAILED
 * On other err : → FAILED permanently
 */

const { Op } = require('sequelize');
const pLimit = require('p-limit');
const MessageLog = require('../models/MessageLog');
const Message = require('../models/Message');
const Contact = require('../models/Contact');
const Template = require('../models/Template');
const Settings = require('../models/Settings');
const Conversation = require('../models/Conversation');
const ChatMessage = require('../models/ChatMessage');
const { getIo } = require('../socket');
const { MAX_RETRIES, RETRY_DELAYS_HOURS } = require('./retryConfig'); // Bug #13 — single source of truth

const CONCURRENCY = 3;   // Low concurrency to avoid Meta rate limits during retries
const BATCH_LIMIT = 500; // Bug #10 — cap per-run to prevent memory overload on large platforms

async function processRetries() {
    try {
        const now = new Date();

        // Bug #10: Capped at BATCH_LIMIT + ordered oldest-due first
        const dueLogs = await MessageLog.findAll({
            where: {
                status: 'RETRY_PENDING',
                retryAfter: { [Op.lte]: now }
            },
            limit: BATCH_LIMIT,
            order: [['retryAfter', 'ASC']]
        });

        if (dueLogs.length === 0) {
            return; // Nothing to do — skip silently
        }

        console.log(`[RETRY PROCESSOR] Found ${dueLogs.length} due retry log(s). Processing...`);

        const limit = pLimit(CONCURRENCY);

        const retryPromises = dueLogs.map(log => limit(async () => {
            try {
                // --- Load parent campaign (Message) ---
                const campaign = await Message.findByPk(log.campaignId);
                if (!campaign) {
                    console.error(`[RETRY] Campaign ${log.campaignId} not found for log ${log.id}. Marking FAILED.`);
                    await log.update({ status: 'FAILED', error: 'Parent campaign not found during retry.' });
                    return;
                }

                const userId = campaign.userId;
                const { params } = campaign.targetConfig || {};

                // --- Load settings ---
                const settings = await Settings.findOne({ where: { userId } });
                if (!settings || !settings.metaAccessToken || !settings.metaPhoneNumberId) {
                    console.error(`[RETRY] Settings missing for user ${userId}. Skipping log ${log.id}.`);
                    return; // Don't permanently fail — settings might be misconfigured temporarily
                }

                // --- Load template ---
                const template = await Template.findByPk(campaign.templateId);
                if (!template) {
                    console.error(`[RETRY] Template ${campaign.templateId} not found. Marking log ${log.id} FAILED.`);
                    await log.update({ status: 'FAILED', error: 'Template not found during retry.' });
                    return;
                }

                // ── Load contact ──────────────────────────────────────────────────────
                let contact = { phone: log.phone, name: 'Customer', email: '', tags: [] };
                if (log.contactId) {
                    const dbContact = await Contact.findByPk(log.contactId, { attributes: ['id', 'name', 'phone', 'email', 'tags'], raw: true });
                    if (dbContact) contact = dbContact;
                }

                const phone = (log.phone || '').replace(/\D/g, '');
                const userParams = params || {};

                // ── Dynamic field resolver ────────────────────────────────────────────
                const resolveParam = (varName) => {
                    const raw = userParams[varName] || '';
                    if (!raw.startsWith('__col__')) return raw;
                    const colKey = raw.replace('__col__', '');
                    const fallback = userParams[`__fallback__${varName}`] || 'Customer';
                    let resolved = '';
                    if (colKey === 'name')            resolved = contact.name || '';
                    else if (colKey === 'first_name') resolved = (contact.name || '').split(' ')[0] || '';
                    else if (colKey === 'phone')      resolved = contact.phone || '';
                    else if (colKey === 'email')      resolved = contact.email || '';
                    else if (colKey === 'tags')       resolved = (contact.tags || [])[0] || '';
                    return resolved.trim() || fallback;
                };

                // ── Bug #1 FIX: Split header vars from body vars ──────────────────────
                // Previously ALL vars were pulled from template.content and sent as
                // body params, completely ignoring TEXT header {{variables}}.
                const stdHeaderType = (template.headerType || '').toUpperCase();

                const headerVarMatches = (stdHeaderType === 'TEXT' && template.headerContent)
                    ? (template.headerContent.match(/\{\{([^}]+)\}\}/g) || [])
                    : [];
                const headerVariables = headerVarMatches.map(v => v.replace(/\{\{|\}\}/g, ''));

                const bodyVarMatches = (template.content || '').match(/\{\{([^}]+)\}\}/g) || [];
                const variables = bodyVarMatches.map(v => v.replace(/\{\{|\}\}/g, ''));

                const headerParameters = headerVariables.map(v => ({ type: 'text', text: resolveParam(v) }));
                const bodyParameters   = variables.map(v => ({ type: 'text', text: resolveParam(v) }));

                console.log(`[RETRY] [${log.id}] [${phone}] tpl="${template.name}" hdrType=${stdHeaderType} hdrVars=[${headerVariables.join(',')}] bodyVars=[${variables.join(',')}]`);

                // ── Build Meta API payload ────────────────────────────────────────────
                const payload = {
                    messaging_product: 'whatsapp',
                    to: phone,
                    type: 'template',
                    template: { name: template.name, language: { code: template.language } }
                };

                // Bug #5 — Carousel archetype needs per-card component builder
                if (template.archetype === 'carousel' && Array.isArray(template.cards) && template.cards.length > 0) {
                    const carouselCards = template.cards.map((card, cardIndex) => {
                        const cardComps = [];
                        const cardHeaderId = userParams[`card_${cardIndex}_headerMediaId`];
                        if (card.headerType && card.headerType !== 'NONE' && cardHeaderId) {
                            const mt = card.headerType.toLowerCase();
                            cardComps.push({ type: 'header', parameters: [{ type: mt, [mt]: { id: cardHeaderId } }] });
                        }
                        const cardVars = card.content
                            ? (card.content.match(/\{\{([^}]+)\}\}/g) || []).map(v => v.replace(/\{\{|\}\}/g, ''))
                            : [];
                        if (cardVars.length > 0) {
                            cardComps.push({ type: 'body', parameters: cardVars.map(vn => {
                                let val = userParams[`card_${cardIndex}_var_${vn}`] || '';
                                if (!val && (vn === 'name' || vn.toLowerCase().includes('name'))) val = contact.name || 'Customer';
                                return { type: 'text', text: val };
                            })});
                        }
                        if (card.buttons && card.buttons.length > 0) {
                            card.buttons.forEach((btn, bi) => {
                                if (btn.type === 'URL') {
                                    const ov = userParams[`card_${cardIndex}_btn_${bi}_url`];
                                    const bc = { type: 'button', sub_type: 'url', index: String(bi) };
                                    if (ov) bc.parameters = [{ type: 'text', text: ov }];
                                    cardComps.push(bc);
                                } else if (btn.type === 'QUICK_REPLY') {
                                    cardComps.push({ type: 'button', sub_type: 'quick_reply', index: String(bi), parameters: [{ type: 'payload', payload: btn.text || 'reply' }] });
                                }
                            });
                        }
                        return { card_index: cardIndex, components: cardComps };
                    });
                    const comps = [];
                    if (bodyParameters.length > 0) comps.push({ type: 'body', parameters: bodyParameters });
                    comps.push({ type: 'carousel', cards: carouselCards });
                    payload.template.components = comps;

                } else {
                    // ── Standard template — build header + body + buttons ─────────────
                    const components = [];

                    // 1. Header
                    const stdHeaderMediaId = userParams['headerMediaId'];
                    if (stdHeaderMediaId && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(stdHeaderType)) {
                        // 1a. Media header (Bug #2)
                        const mediaType = stdHeaderType.toLowerCase();
                        const mediaParam = { id: stdHeaderMediaId };
                        if (mediaType === 'document') mediaParam.filename = userParams['headerFilename'] || template.name || 'document';
                        components.push({ type: 'header', parameters: [{ type: mediaType, [mediaType]: mediaParam }] });
                        console.log(`[RETRY] [${phone}] Header → ${stdHeaderType} media id=${stdHeaderMediaId}`);
                    } else if (stdHeaderType === 'TEXT' && headerParameters.length > 0) {
                        // 1b. TEXT header with variables (Bug #1)
                        components.push({ type: 'header', parameters: headerParameters });
                        console.log(`[RETRY] [${phone}] Header → TEXT vars: ${headerParameters.map(p => `"${p.text}"`).join(', ')}`);
                    } else if (stdHeaderType === 'TEXT') {
                        // 1c. Static TEXT header — no runtime component needed
                        console.log(`[RETRY] [${phone}] Header → TEXT static`);
                    }

                    // 2. Body
                    if (bodyParameters.length > 0) {
                        bodyParameters.forEach((p, i) => {
                            if (!p.text || p.text.trim() === '') {
                                console.warn(`[RETRY] [${phone}] WARN: body param[${i}] ("${variables[i]}") resolved to empty string — may cause #132012`);
                            }
                        });
                        components.push({ type: 'body', parameters: bodyParameters });
                    }

                    // 3. Buttons (Bug #2)
                    if (Array.isArray(template.buttons) && template.buttons.length > 0) {
                        template.buttons.forEach((btn, bi) => {
                            if (btn.type === 'URL') {
                                const ov = userParams[`btn_${bi}_url`];
                                if (ov) components.push({ type: 'button', sub_type: 'url', index: String(bi), parameters: [{ type: 'text', text: ov }] });
                            } else if (btn.type === 'QUICK_REPLY') {
                                components.push({ type: 'button', sub_type: 'quick_reply', index: String(bi), parameters: [{ type: 'payload', payload: btn.text || 'reply' }] });
                            }
                        });
                    }

                    if (components.length > 0) payload.template.components = components;
                }

                console.log(`[RETRY] [${log.id}] Firing retry #${log.retryCount} →`, JSON.stringify(payload, null, 2));

                // --- Fire the retry to Meta API ---
                const metaRes = await fetch(`https://graph.facebook.com/v21.0/${settings.metaPhoneNumberId}/messages`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${settings.metaAccessToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });

                const data = await metaRes.json();

                if (metaRes.ok) {
                    // ✅ SUCCESS — message accepted by Meta
                    const sentMessageId = data.messages?.[0]?.id;
                    console.log(`[RETRY] ✅ Success for log ${log.id} (phone: ${phone}). New Meta msgId: ${sentMessageId}`);

                    await log.update({
                        status: 'SENT',
                        messageId: sentMessageId || log.messageId,
                        retryAfter: null,
                        error: null,
                        metaTimestamp: Math.floor(Date.now() / 1000).toString()
                    });

                    // Bug #4 FIX: Removed Message.increment({ sentCount }) — it was a no-op
                    // because the API calculates sentCount directly from MessageLog records.

                    // Bug #8 FIX: Mark contact as Active on retry success
                    if (log.contactId) {
                        try {
                            await Contact.update({ status: 'Active' }, { where: { id: log.contactId } });
                            console.log(`[RETRY] Contact ${log.contactId} marked Active after retry success.`);
                        } catch (contactErr) {
                            console.error(`[RETRY] Failed to mark contact Active:`, contactErr.message);
                        }
                    }

                    // ── Sync to Inbox (Conversation + ChatMessage) ────────────────────
                    try {
                        const nowTs = new Date();

                        // Build human-readable message body with variables substituted
                        let fullBody = template.content || '';
                        variables.forEach(varName => {
                            const val = resolveParam(varName);
                            fullBody = fullBody.replace(new RegExp(`\\{\\{${varName}\\}\\}`, 'g'), val);
                        });
                        // Also substitute header variables in preview if TEXT header
                        let headerPreview = '';
                        if (stdHeaderType === 'TEXT' && template.headerContent) {
                            headerPreview = template.headerContent;
                            headerVariables.forEach(varName => {
                                const val = resolveParam(varName);
                                headerPreview = headerPreview.replace(new RegExp(`\\{\\{${varName}\\}\\}`, 'g'), val);
                            });
                        }
                        if (!fullBody) fullBody = headerPreview || `Template: ${template.name}`;

                        // Find or create Conversation
                        let conversation = await Conversation.findOne({ where: { phoneNumber: phone, userId } });
                        if (!conversation) {
                            conversation = await Conversation.create({
                                phoneNumber: phone,
                                contactName: contact.name || 'Unknown',
                                userId,
                                lastMessage: fullBody,
                                lastMessageAt: nowTs,
                                unreadCount: 0
                            });
                        } else {
                            conversation.lastMessage = fullBody;
                            conversation.lastMessageAt = nowTs;
                            await conversation.save();
                        }

                        // Build rich component data for template preview in inbox
                        const richComponents = [];
                        if (stdHeaderType === 'TEXT' && headerPreview) richComponents.push({ type: 'HEADER', text: headerPreview });
                        else if (['IMAGE', 'VIDEO', 'DOCUMENT'].includes(stdHeaderType)) richComponents.push({ type: 'HEADER', mediaType: stdHeaderType });
                        if (template.content) richComponents.push({ type: 'BODY', text: fullBody });
                        if (template.buttons && template.buttons.length > 0) richComponents.push({ type: 'BUTTONS', buttons: template.buttons });

                        // Find existing ChatMessage by old messageId (to avoid double-counting)
                        const existingChatMsg = log.messageId
                            ? await ChatMessage.findOne({ where: { messageId: log.messageId } })
                            : null;

                        let chatMsg;
                        if (existingChatMsg) {
                            // Update in-place — correct status from 'failed'/'retry_pending' → 'sent'
                            existingChatMsg.status = 'sent';
                            existingChatMsg.messageId = sentMessageId || existingChatMsg.messageId;
                            existingChatMsg.timestamp = nowTs;
                            await existingChatMsg.save();
                            chatMsg = existingChatMsg;
                            console.log(`[RETRY INBOX] Updated existing ChatMessage ${existingChatMsg.id} for phone: ${phone}`);
                        } else {
                            // No existing ChatMessage — safe to create one (original inbox sync must have failed)
                            chatMsg = await ChatMessage.create({
                                conversationId: conversation.id,
                                messageId: sentMessageId,
                                direction: 'OUTBOUND',
                                type: 'template',
                                body: fullBody,
                                templateData: { name: template.name, language: template.language, components: richComponents },
                                status: 'sent',
                                timestamp: nowTs
                            });
                            console.log(`[RETRY INBOX] Created new ChatMessage for phone: ${phone} (no existing found)`);
                        }

                        // Real-time socket push
                        try {
                            getIo().to(userId).emit('new_message', { conversation, message: chatMsg });
                        } catch (wsErr) {
                            console.error('[RETRY INBOX] Socket emit failed:', wsErr.message);
                        }

                    } catch (inboxErr) {
                        console.error('[RETRY INBOX] Failed to sync inbox for phone:', phone, inboxErr.message);
                    }

                } else {
                    // ❌ Meta returned an error
                    const errCode = data.error?.code;
                    const errMsg = data.error?.message || 'Meta API Error during retry';

                    console.error(`[RETRY] ❌ Meta error for log ${log.id} [${phone}]: code=${errCode} msg="${errMsg}"`);
                    console.error(`[RETRY]    Payload that failed:`, JSON.stringify(payload, null, 2));

                    if (errCode === 131049) {
                        // Frequency cap still active — schedule the NEXT retry if attempts remain
                        const currentRetryCount = log.retryCount || 0;
                        if (currentRetryCount < MAX_RETRIES) {
                            // Use currentRetryCount as delay index (it was already incremented by
                            // webhook/previous retryProcessor run, so it correctly maps to next slot)
                            const delayHours = RETRY_DELAYS_HOURS[currentRetryCount] || RETRY_DELAYS_HOURS[RETRY_DELAYS_HOURS.length - 1];
                            const retryAfter = new Date(Date.now() + delayHours * 60 * 60 * 1000);
                            await log.update({
                                status: 'RETRY_PENDING',
                                retryCount: currentRetryCount + 1,
                                retryAfter,
                                errorCode: 131049,
                                error: `Frequency cap still active (131049). Retry ${currentRetryCount + 1}/${MAX_RETRIES} scheduled in ${delayHours}h.`
                            });
                            console.log(`[RETRY] 131049 still active for log ${log.id}. Scheduled retry ${currentRetryCount + 1}/${MAX_RETRIES} in ${delayHours}h at ${retryAfter.toISOString()}`);
                        } else {
                            // All retries exhausted — permanently fail
                            await log.update({
                                status: 'FAILED',
                                retryAfter: null,
                                errorCode: 131049,
                                error: `Frequency cap (131049). All ${MAX_RETRIES} retries exhausted.`
                            });
                            console.log(`[RETRY] All ${MAX_RETRIES} retries exhausted for log ${log.id}. Permanently FAILED.`);
                        }

                    } else if (errCode === 131026) {
                        // Bug #9 FIX: 131026 = recipient not on WhatsApp — mark contact permanently
                        console.log(`[RETRY] 131026 for log ${log.id} — marking contact as "Not on WhatsApp"`);
                        try {
                            await Contact.update(
                                { status: 'Not on WhatsApp' },
                                { where: { phone: log.phone, userId } }
                            );
                        } catch (contactErr) {
                            console.error(`[RETRY] Failed to update contact status:`, contactErr.message);
                        }
                        await log.update({
                            status: 'FAILED',
                            retryAfter: null,
                            errorCode: 131026,
                            error: 'Number is not on WhatsApp'
                        });

                    } else {
                        // Any other error — don't retry, permanently fail
                        const friendlyErrors = {
                            131009: 'Invalid WhatsApp number',
                            131021: 'Recipient opted out of messages',
                            131051: 'Message type not supported',
                            131008: 'Required parameter missing',
                            131047: 'Message failed — recipient not reachable',
                            131031: 'Business account restricted by Meta',
                            130472: 'Recipient is in a Meta A/B test — not sent',
                            132012: 'Template parameter mismatch — check template variables'
                        };
                        await log.update({
                            status: 'FAILED',
                            retryAfter: null,
                            errorCode: errCode || null,
                            error: friendlyErrors[errCode] || errMsg
                        });
                        console.error(`[RETRY] Non-retryable error ${errCode} for log ${log.id}. Permanently FAILED.`);
                    }
                }

            } catch (logErr) {
                console.error(`[RETRY PROCESSOR] Unhandled error for log ${log.id}:`, logErr.message, logErr.stack);
                // Don't crash the whole batch — just log and continue
            }
        }));

        await Promise.all(retryPromises);
        console.log(`[RETRY PROCESSOR] Batch complete. Processed ${dueLogs.length} log(s).`);

    } catch (err) {
        console.error('[RETRY PROCESSOR] Fatal error in processRetries():', err.message, err.stack);
    }
}

module.exports = { processRetries };
