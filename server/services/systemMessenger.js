const axios = require('axios');
const SystemConfig = require('../models/SystemConfig');
const User = require('../models/User');
const Settings = require('../models/Settings');

/**
 * Variable map: each event's ordered variable keys that get injected into
 * WhatsApp template parameters as {{1}}, {{2}}, {{3}} etc.
 * Must match the template body placeholders exactly.
 */
const EVENT_VARIABLE_MAP = {
    user_registered:        ['name', 'email', 'plan'],
    purchase_made:          ['name', 'plan', 'amount'],
    payment_failed:         ['name', 'plan'],
    support_ticket_raised:  ['name', 'subject'],
    support_ticket_replied: ['name', 'subject'],
    feature_suggestion:     ['name', 'suggestion'],
    tech_partner_request:   ['name', 'company'],
    contact_inquiry:        ['name', 'message'],
    system_error:           ['error'],
    trial_expiring:         ['name', 'days'],
    nfc_order:              ['name', 'orderId'],
    payout_request:         ['name', 'amount'],
    ai_tokens_depleted:     ['name'],
    addon_installed:        ['name', 'addonName'],
};


const sendSystemMessage = async (to, type, payload) => {
    try {
        const config = await SystemConfig.getCachedConfig();
        const linkedAdminId = config?.settings?.linkedAdminUserId;

        if (!linkedAdminId) {
            console.warn('System Messenger: No linked platform CRM account. Aborting message.');
            return { success: false, error: 'No linked account' };
        }

        // Normalize phone: strip all non-digits so '+919952084440' and '919952084440'
        // always resolve to the same conversation ('919952084440').
        const normalizedTo = String(to).replace(/\D/g, '');

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
            to: normalizedTo,  // always digits-only to Meta API
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
            const Contact = require('../models/Contact');

            // Find or Create Conversation — always use normalizedTo for consistency
            let conversation = await Conversation.findOne({
                where: { userId: linkedAdminId, phoneNumber: normalizedTo }
            });

            if (!conversation) {
                // Try to get the contact name from the Contacts table
                const contact = await Contact.findOne({
                    where: { userId: linkedAdminId, phone: normalizedTo }
                });
                const contactName = contact?.name || normalizedTo;

                conversation = await Conversation.create({
                    userId: linkedAdminId,
                    phoneNumber: normalizedTo,
                    contactName: contactName,
                    unreadCount: 0
                });
            } else if (conversation.contactName === conversation.phoneNumber || conversation.contactName === normalizedTo) {
                // Conversation exists but name is still just the phone number — try to update it
                const contact = await Contact.findOne({
                    where: { userId: linkedAdminId, phone: normalizedTo }
                });
                if (contact?.name) {
                    conversation.contactName = contact.name;
                    await conversation.save();
                }
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

/**
 * Sends an admin alert to all configured admin phone numbers for a given event.
 *
 * Supports two modes:
 *  - Template mode (templateModeEnabled = true): Sends an approved Meta WhatsApp
 *    template with variables substituted into {{1}}, {{2}} etc.
 *  - Text mode (fallback): Sends a plain text message (works only within 24h session window).
 *
 * @param {string} eventName  - The event key (e.g. 'user_registered')
 * @param {string} messageText - The fallback text message
 * @param {object} [variables] - Key→value map of variables for template substitution
 *                               e.g. { name: 'John', email: 'john@x.com', plan: 'Pro' }
 */
const sendAdminAlert = async (eventName, messageText, variables = {}) => {
    try {
        const config = await SystemConfig.getCachedConfig();
        const settings = config?.settings || {};

        // Check global event config
        const eventsConfig = settings.adminNotificationEvents || {};
        const eventConfig = eventsConfig[eventName];

        // If event key doesn't exist or is explicitly disabled, bail out
        if (!eventConfig || eventConfig.enabled === false) return false;

        // Get the list of admin phone numbers
        const numbers = settings.adminNotificationNumbers || [];
        if (!Array.isArray(numbers) || numbers.length === 0) return false;

        const templateModeEnabled = eventsConfig.templateModeEnabled === true;

        let successCount = 0;
        for (const phone of numbers) {
            const toPhone = String(phone).replace(/\D/g, '');
            if (!toPhone) continue;

            if (templateModeEnabled && eventConfig.templateName) {
                // ── Template Mode ────────────────────────────────────────────────────
                const templateName = eventConfig.templateName;
                const varKeys = EVENT_VARIABLE_MAP[eventName] || [];

                // Build parameters in declaration order
                const parameters = varKeys
                    .map(key => ({ type: 'text', text: String(variables[key] || 'N/A') }));

                // Variable count validation
                if (varKeys.length > 0 && parameters.length !== varKeys.length) {
                    console.warn(
                        `[SystemMessenger] Variable mismatch for event "${eventName}": ` +
                        `expected ${varKeys.length} (${varKeys.join(', ')}), got ${parameters.length} from payload.`
                    );
                }

                const components = parameters.length > 0
                    ? [{ type: 'body', parameters }]
                    : [];

                const result = await sendSystemMessage(toPhone, 'template', {
                    templateName,
                    languageCode: eventConfig.languageCode || 'en',
                    components
                });
                if (result?.success) successCount++;
            } else {
                // ── Text Mode ─────────────────────────────────────────────────────────
                const result = await sendSystemMessage(toPhone, 'text', {
                    body: `🚨 *Admin Alert*\n\n${messageText}`
                });
                if (result?.success) successCount++;
            }
        }

        return successCount > 0;
    } catch (err) {
        console.error('[SystemMessenger] Error sending admin alert:', err.message);
        return false;
    }
};

module.exports = {
    sendSystemMessage,
    sendAdminAlert,
    EVENT_VARIABLE_MAP
};
