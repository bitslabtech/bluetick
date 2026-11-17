// One wording for Meta error codes, used by the ledger, campaign logs, the inbox and the
// superadmin failed-reasons breakdown.
const REASONS = {
    131026: 'Number is not on WhatsApp',
    131009: 'Invalid WhatsApp number',
    131021: 'Recipient opted out of messages',
    131051: 'Message type not supported for this recipient',
    131008: 'Required parameter missing',
    131047: 'Message failed — recipient not reachable (24-hour window closed)',
    131031: 'Business account restricted by Meta',
    130472: 'Recipient is in a Meta A/B test — message not sent',
    131049: 'Meta frequency cap for marketing messages',
    132012: 'Template parameter mismatch — variables do not match the approved template',
    132001: 'Template does not exist or is not approved',
    131056: 'Too many messages to this number in a short time',
    130429: 'Meta rate limit reached',
    131048: 'Spam rate limit reached — number quality too low',
    190: 'WhatsApp access token expired or invalid',
    PLAN_LIMIT: 'Monthly message limit of your plan reached',
    API_TO_API: "WhatsApp does not support messaging between API accounts",
    NOT_CONNECTED: 'WhatsApp is not connected for this account',
    NETWORK: 'Could not reach Meta (network error)',
    LOCAL: 'Message could not be prepared'
};

function friendlyReason(code, raw) {
    if (code !== undefined && code !== null && REASONS[code]) return REASONS[code];
    return raw || 'Message delivery failed';
}

// From a Meta status webhook entry: { code, reason }
function fromStatusUpdate(statusUpdate) {
    const e = statusUpdate?.errors?.[0];
    const code = e?.code ?? null;
    return { code: code !== null ? String(code) : null, reason: friendlyReason(code, e?.title || e?.message) };
}

module.exports = { REASONS, friendlyReason, fromStatusUpdate };
