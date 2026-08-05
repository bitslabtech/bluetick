/**
 * retryProcessor.js
 *
 * Handles retrying MessageLog entries that have status = 'RETRY_PENDING' and
 * whose retryAfter timestamp has passed.
 *
 * This is triggered by the scheduler (scheduler.js) every 30 minutes.
 *
 * Progressive retry schedule (set in webhook.js):
 *   Retry 1: +8h from original failure
 *   Retry 2: +16h from retry 1
 *   Retry 3: +24h from retry 2
 *
 * On success: log → SENT, campaign sentCount++, inbox + socket updated
 * On 131049 again: schedule next retry (if retries remain) or → FAILED
 * On any other error: → FAILED permanently
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

const MAX_RETRIES = 3;
const RETRY_DELAYS_HOURS = [8, 16, 24];
const CONCURRENCY = 3; // Low concurrency to avoid Meta rate limits during retries

async function processRetries() {
    try {
        const now = new Date();

        // Find all logs that are due for a retry attempt
        const dueLogs = await MessageLog.findAll({
            where: {
                status: 'RETRY_PENDING',
                retryAfter: { [Op.lte]: now }
            }
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

                // --- Load contact (for dynamic variable resolution) ---
                let contact = { phone: log.phone, name: 'Customer', email: '' };
                if (log.contactId) {
                    const dbContact = await Contact.findByPk(log.contactId, { attributes: ['id', 'name', 'phone', 'email', 'tags'], raw: true });
                    if (dbContact) contact = dbContact;
                }

                // --- Resolve template variables (same logic as campaignProcessor) ---
                const variableMatches = (template.content || '').match(/\{\{([^}]+)\}\}/g) || [];
                const variables = variableMatches.map(v => v.replace(/\{\{|\}\}/g, ''));
                const userParams = params || {};

                const resolveParam = (varName) => {
                    const raw = userParams[varName] || '';
                    if (!raw.startsWith('__col__')) return raw;
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

                const phone = (log.phone || '').replace(/\D/g, '');
                const bodyParameters = variables.map(v => ({ type: 'text', text: resolveParam(v) }));

                // --- Build Meta API payload ---
                const payload = {
                    messaging_product: 'whatsapp',
                    to: phone,
                    type: 'template',
                    template: {
                        name: template.name,
                        language: { code: template.language }
                    }
                };

                if (bodyParameters.length > 0) {
                    payload.template.components = [{ type: 'body', parameters: bodyParameters }];
                }

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

                    // Update campaign counters atomically
                    await Message.increment({ sentCount: 1 }, { where: { id: campaign.id } });

                    // Sync to Inbox (Conversation + ChatMessage)
                    try {
                        const now = new Date();
                        let fullBody = template.content || '';
                        variables.forEach(varName => {
                            const val = resolveParam(varName);
                            fullBody = fullBody.replace(new RegExp(`\\{\\{${varName}\\}\\}`, 'g'), val);
                        });
                        if (!fullBody) fullBody = `Template: ${template.name}`;

                        let conversation = await Conversation.findOne({ where: { phoneNumber: phone, userId } });
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

                        const richComponents = [];
                        if (template.content) richComponents.push({ type: 'BODY', text: fullBody });
                        if (template.buttons && template.buttons.length > 0) {
                            richComponents.push({ type: 'BUTTONS', buttons: template.buttons });
                        }


                        // ── Inbox sync: find-or-update to prevent double-counting ─────────────
                        // The original send (HTTP 200) already created a ChatMessage and counted
                        // this message toward the monthly limit. If we create a new ChatMessage
                        // here on retry success, it would count TWICE. Instead we find the
                        // existing ChatMessage by the old messageId stored on the log and simply
                        // update it to 'sent' with the new messageId.
                        const existingChatMsg = log.messageId
                            ? await ChatMessage.findOne({ where: { messageId: log.messageId } })
                            : null;

                        let chatMsg;
                        if (existingChatMsg) {
                            // Update in-place — no new row, no double-count
                            existingChatMsg.status = 'sent';
                            existingChatMsg.messageId = sentMessageId || existingChatMsg.messageId;
                            existingChatMsg.timestamp = now;
                            await existingChatMsg.save();
                            chatMsg = existingChatMsg;
                            console.log(`[RETRY INBOX] Updated existing ChatMessage ${existingChatMsg.id} for phone: ${phone}`);
                        } else {
                            // No existing ChatMessage found (original inbox sync must have failed)
                            // Safe to create a new one — this is the first time it's being counted
                            chatMsg = await ChatMessage.create({
                                conversationId: conversation.id,
                                messageId: sentMessageId,
                                direction: 'OUTBOUND',
                                type: 'template',
                                body: fullBody,
                                templateData: { name: template.name, language: template.language, components: richComponents },
                                status: 'sent',
                                timestamp: now
                            });
                            console.log(`[RETRY INBOX] Created new ChatMessage for phone: ${phone} (no existing found)`);
                        }

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

                    if (errCode === 131049) {
                        // Frequency cap still active — schedule next retry if possible
                        const currentRetryCount = log.retryCount || 0;
                        if (currentRetryCount < MAX_RETRIES) {
                            const delayHours = RETRY_DELAYS_HOURS[currentRetryCount];
                            const retryAfter = new Date(Date.now() + delayHours * 60 * 60 * 1000);
                            await log.update({
                                status: 'RETRY_PENDING',
                                retryCount: currentRetryCount + 1,
                                retryAfter,
                                errorCode: 131049,
                                error: `Frequency cap still active (131049). Retry ${currentRetryCount + 1}/${MAX_RETRIES} in ${delayHours}h.`
                            });
                            console.log(`[RETRY] 131049 still active for log ${log.id}. Scheduled retry ${currentRetryCount + 1}/${MAX_RETRIES} in ${delayHours}h.`);
                        } else {
                            await log.update({
                                status: 'FAILED',
                                errorCode: 131049,
                                error: `Frequency cap (131049). All ${MAX_RETRIES} retries exhausted.`
                            });
                            console.log(`[RETRY] All retries exhausted for log ${log.id}. Permanent FAILED.`);
                        }
                    } else {
                        // Different error — don't retry, permanently fail
                        await log.update({
                            status: 'FAILED',
                            errorCode: errCode || null,
                            error: errMsg
                        });
                        console.error(`[RETRY] Non-retryable error ${errCode} for log ${log.id}: ${errMsg}`);
                    }
                }

            } catch (logErr) {
                console.error(`[RETRY PROCESSOR] Unhandled error for log ${log.id}:`, logErr.message);
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
