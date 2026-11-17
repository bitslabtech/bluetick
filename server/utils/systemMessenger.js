// Kept for older imports only. The one platform messenger is services/systemMessenger.js, which
// sends through the outbound gateway. (There used to be a second, separate copy here.)
const core = require('../services/systemMessenger');

// Old signature: content.text for text messages; returns Meta's response data or false.
async function sendSystemMessage(toPhone, type, content = {}, opts = {}) {
    const payload = type === 'text' ? { body: content.text ?? content.body } : content;
    const r = await core.sendSystemMessage(toPhone, type, payload, { source: 'platform_billing', ...opts });
    return r?.success ? r.data : false;
}

module.exports = {
    sendSystemMessage,
    sendAdminAlert: core.sendAdminAlert,
    EVENT_VARIABLE_MAP: core.EVENT_VARIABLE_MAP
};
