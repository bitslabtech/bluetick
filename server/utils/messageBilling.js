const MessageBilling = require('../models/MessageBilling');

// Feature keys stamped by senders -> group shown on the usage page.
const SOURCE_GROUPS = {
    campaign:    { key: 'broadcasts',  label: 'Broadcasts' },
    inbox:       { key: 'inbox',       label: 'Live inbox' },
    flowbot:     { key: 'flowbot',     label: 'Flowbot' },
    auto_reply:  { key: 'auto',        label: 'Auto-replies & AI' },
    ai_bot:      { key: 'auto',        label: 'Auto-replies & AI' },
    store_order: { key: 'store',       label: 'Store orders & OTP' },
    store_otp:   { key: 'store',       label: 'Store orders & OTP' },
    forms:       { key: 'forms',       label: 'Forms' },
    ads:         { key: 'ads',         label: 'Click-to-WhatsApp ads' },
    api:         { key: 'api',         label: 'Developer API' },
    system:      { key: 'system',      label: 'System notifications' },
    landing:     { key: 'system',      label: 'System notifications' },
    test:        { key: 'system',      label: 'System notifications' }
};
const OTHER_GROUP = { key: 'other', label: 'Other / sent outside Bluetick' };
const groupFor = (source) => SOURCE_GROUPS[source] || OTHER_GROUP;

const STATUS_RANK = { failed: 0, sent: 1, delivered: 2, read: 3 };

// Stamp which feature sent a message. Call right after Meta returns the wamid.
// Never throws: usage tracking must not break message sending.
async function tagOutbound(userId, messageId, source) {
    try {
        if (!userId || !messageId || !source) return;
        const [row, created] = await MessageBilling.findOrCreate({
            where: { messageId },
            defaults: { userId, messageId, source, status: 'sent' }
        });
        if (!created && !row.source) await row.update({ source });
    } catch (err) {
        console.error('[MSG-BILLING] tagOutbound failed:', err.message);
    }
}

// For messages no sender tagged: infer the feature from what the inbox / campaign tables know.
async function inferSource(messageId) {
    const MessageLog = require('../models/MessageLog');
    const ChatMessage = require('../models/ChatMessage');
    if (await MessageLog.findOne({ where: { messageId }, attributes: ['id'] })) return 'campaign';
    const chat = await ChatMessage.findOne({ where: { messageId }, attributes: ['source', 'direction'] });
    if (!chat) return null;
    return chat.source || (chat.direction === 'OUTBOUND' ? 'inbox' : null);
}

// Called from the status webhook for every outbound status update.
async function recordPricing(userId, statusUpdate, rawStatus) {
    try {
        const messageId = statusUpdate?.id;
        if (!userId || !messageId) return;
        const pricing = statusUpdate.pricing || null;

        const [row] = await MessageBilling.findOrCreate({
            where: { messageId },
            defaults: { userId, messageId, status: rawStatus }
        });

        const patch = {};
        if (!row.source) {
            const inferred = await inferSource(messageId);
            if (inferred) patch.source = inferred;
        }
        if ((STATUS_RANK[rawStatus] ?? -1) > (STATUS_RANK[row.status] ?? -1)) patch.status = rawStatus;
        if (pricing) {
            if (pricing.pricing_model) patch.pricingModel = String(pricing.pricing_model).toUpperCase();
            if (pricing.type) patch.pricingType = String(pricing.type).toUpperCase();
            if (pricing.category) patch.pricingCategory = String(pricing.category).toUpperCase();
            if (typeof pricing.billable === 'boolean') patch.billable = pricing.billable;
        }
        if (Object.keys(patch).length) await row.update(patch);
    } catch (err) {
        console.error('[MSG-BILLING] recordPricing failed:', err.message);
    }
}

module.exports = { tagOutbound, recordPricing, groupFor, SOURCE_GROUPS, OTHER_GROUP };
