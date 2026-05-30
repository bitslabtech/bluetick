const axios = require('axios');
const Settings = require('../models/Settings');
const SystemConfig = require('../models/SystemConfig');

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
            console.warn("[SystemMessenger] No linkedAdminUserId configured. Cannot send system message.");
            return false;
        }

        const settings = await Settings.findOne({ where: { userId: linkedAdminId } });
        
        if (!settings || !settings.metaPhoneNumberId || !settings.metaAccessToken) {
            console.warn("[SystemMessenger] Admin WhatsApp credentials missing. Cannot send system message.");
            return false;
        }

        const payload = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: toPhone,
            type: type
        };

        if (type === 'template') {
            payload.template = {
                name: content.templateName,
                language: { code: content.languageCode || "en_US" },
                components: content.components || []
            };
        } else if (type === 'text') {
            payload.text = { body: content.text };
        }

        const response = await axios.post(
            `https://graph.facebook.com/v21.0/${settings.metaPhoneNumberId}/messages`,
            payload,
            {
                headers: {
                    'Authorization': `Bearer ${settings.metaAccessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        return response.data;
    } catch (err) {
        console.error("[SystemMessenger] Error:", err.response?.data || err.message);
        return false;
    }
}

module.exports = {
    sendSystemMessage
};
