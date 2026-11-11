/**
 * WhatsApp API-to-API guard.
 *
 * Meta does not deliver messages from one WhatsApp Business API number to another, yet its
 * webhook still reports them as "delivered" — so the inbox showed grey double ticks for
 * messages the recipient never got. Meta gives no error we can rely on, so we detect it
 * ourselves: a recipient whose number is connected as a WhatsApp API number on this platform
 * (User.metaDisplayPhoneNumber, set on connect and cleared on disconnect).
 *
 * Numbers registered on the API through other providers cannot be detected this way.
 */
const { Op, fn, col, where: sqlWhere } = require('sequelize');
const User = require('../models/User');

const API_TO_API_ERROR = "Not sent: Meta doesn't allow messages between two WhatsApp API numbers.";

/**
 * @param {string} phone  Recipient number in any format (+91 98765 43210, 919876543210, ...)
 * @returns {Promise<boolean>} true when the number is a connected WhatsApp API number
 */
async function isWhatsAppApiNumber(phone) {
    const digits = String(phone || '').replace(/\D/g, '');
    if (digits.length < 8) return false;
    try {
        const match = await User.findOne({
            attributes: ['id'],
            where: {
                metaPhoneNumberId: { [Op.ne]: null },
                [Op.and]: [
                    sqlWhere(fn('regexp_replace', col('metaDisplayPhoneNumber'), '[^0-9]', '', 'g'), digits)
                ]
            }
        });
        return !!match;
    } catch (err) {
        // Never block a send because the check itself failed
        console.error('[API-TO-API GUARD] Lookup failed, allowing send:', err.message);
        return false;
    }
}

module.exports = { isWhatsAppApiNumber, API_TO_API_ERROR };
