const axios = require('axios');
const Settings = require('../models/Settings');
const SystemConfig = require('../models/SystemConfig');

/**
 * Variable map: each event's human-readable variables that get injected
 * into the WhatsApp template as {{1}}, {{2}}, {{3}} etc.
 */
const EVENT_VARIABLE_MAP = {
    user_registered:        ['name', 'email'],
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

/**
 * Sends a WhatsApp message using the global "linked admin" credentials.
 * This is used for system alerts (quota, expiry, global broadcasts).
 *
 * @param {string} toPhone - Recipient phone number with country code.
 * @param {string} type - 'text' or 'template'
 * @param {object} content - Content payload (text or template structure)
 */
async function sendSystemMessage(toPhone, type, content) {
    try {
        const config = await SystemConfig.getCachedConfig();
        const linkedAdminId = config?.settings?.linkedAdminUserId;

        if (!linkedAdminId) {
            console.warn('[SystemMessenger] No linkedAdminUserId configured. Cannot send system message.');
            return false;
        }

        const settings = await Settings.findOne({ where: { userId: linkedAdminId } });

        if (!settings || !settings.metaPhoneNumberId || !settings.metaAccessToken) {
            console.warn('[SystemMessenger] Admin WhatsApp credentials missing. Cannot send system message.');
            return false;
        }

        const token = settings.metaAccessToken.replace(/[^\x20-\x7E]/g, '').trim();
        const phoneId = settings.metaPhoneNumberId.replace(/[^\x20-\x7E]/g, '').trim();

        const payload = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: String(toPhone).replace(/\D/g, ''),
            type: type
        };

        if (type === 'template') {
            payload.template = {
                name: content.templateName,
                language: { code: content.languageCode || 'en' },
                components: content.components || []
            };
        } else if (type === 'text') {
            payload.text = { body: content.text };
        }

        const response = await axios.post(
            `https://graph.facebook.com/v21.0/${phoneId}/messages`,
            payload,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        return response.data;
    } catch (err) {
        console.error('[SystemMessenger] Error:', err.response?.data || err.message);
        return false;
    }
}

/**
 * Sends an admin alert to all configured admin phone numbers.
 *
 * Supports two modes:
 *  - Template mode (templateModeEnabled = true): Sends an approved Meta WhatsApp
 *    template with variables substituted into {{1}}, {{2}} etc.
 *  - Text mode (fallback): Sends a plain text message (only works within 24h session window).
 *
 * @param {string} eventName  - The event key (e.g. 'user_registered')
 * @param {string} messageText - The formatted fallback text message
 * @param {object} [variables] - Optional key→value map of variables for template substitution
 *                               e.g. { name: 'John', email: 'john@x.com', plan: 'Pro' }
 */
async function sendAdminAlert(eventName, messageText, variables = {}) {
    try {
        const config = await SystemConfig.getCachedConfig();
        const settings = config?.settings || {};

        // Check global event config
        const eventsConfig = settings.adminNotificationEvents || {};
        const eventConfig = eventsConfig[eventName];

        // If the event key doesn't exist or is explicitly disabled, bail out
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

                // Build components array: body parameters in order
                const parameters = varKeys
                    .map(key => ({ type: 'text', text: String(variables[key] || 'N/A') }));

                // Validate: warn if variable count mismatch
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
                if (result) successCount++;
            } else {
                // ── Text Mode ─────────────────────────────────────────────────────────
                const result = await sendSystemMessage(toPhone, 'text', {
                    text: `🚨 *Admin Alert*\n\n${messageText}`
                });
                if (result) successCount++;
            }
        }

        return successCount > 0;
    } catch (err) {
        console.error('[SystemMessenger] Error sending admin alert:', err.message);
        return false;
    }
}

module.exports = {
    sendSystemMessage,
    sendAdminAlert,
    EVENT_VARIABLE_MAP
};
