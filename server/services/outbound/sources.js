// Every kind of WhatsApp message Bluetick sends. The gateway refuses a source that is not listed,
// so a new feature must add one line here — that is the only step needed for it to be counted
// in reports, the plan limit and the usage page.
//
// group:    row on the Usage & Spend page
// platform: sent from Bluetick's own number; never shown in a customer's stats or plan limit
// All customer sources count toward the plan limit (product decision, 2026-11-17).

const GROUPS = {
    broadcasts: 'Broadcasts',
    inbox: 'Live inbox',
    flowbot: 'Flowbot',
    auto: 'Auto-replies & AI',
    store: 'Online store',
    forms: 'Forms & checkout',
    ads: 'Click-to-WhatsApp ads',
    api: 'Developer API',
    other_features: 'Other features',
    platform: 'Bluetick notifications',
    external: 'Other / sent outside Bluetick'
};

const SOURCES = {
    // Broadcasts
    campaign:             { group: 'broadcasts', label: 'Broadcast campaign' },
    campaign_retry:       { group: 'broadcasts', label: 'Broadcast retry' },
    // Inbox and API
    inbox:                { group: 'inbox', label: 'Live inbox' },
    api:                  { group: 'api', label: 'Developer API' },
    // Automation
    flowbot:              { group: 'flowbot', label: 'Flowbot' },
    opt_out_ack:          { group: 'auto', label: 'Opt-out confirmation' },
    auto_reply:           { group: 'auto', label: 'Keyword / greeting auto-reply' },
    ctwa_welcome:         { group: 'auto', label: 'Ad welcome reply' },
    ai_bot:               { group: 'auto', label: 'AI bot reply' },
    // Online store
    store_order:          { group: 'store', label: 'Order notification' },
    store_invoice:        { group: 'store', label: 'Order invoice' },
    store_shipping:       { group: 'store', label: 'Shipping update' },
    store_owner_alert:    { group: 'store', label: 'New order alert to owner' },
    store_cart:           { group: 'store', label: 'Abandoned cart reminder' },
    store_otp:            { group: 'store', label: 'Store login OTP' },
    // Forms, ads, other
    forms:                { group: 'forms', label: 'Form automation' },
    checkout:             { group: 'forms', label: 'Checkout automation' },
    ctwa_retarget:        { group: 'ads', label: 'Ad lead retargeting' },
    landing:              { group: 'other_features', label: 'Landing page lead' },
    gateway_test:         { group: 'other_features', label: 'Test message' },
    call_followup:        { group: 'other_features', label: 'Call follow-up' },
    // Bluetick's own number
    platform_otp:            { group: 'platform', label: 'Sign-up / password OTP', platform: true },
    platform_billing:        { group: 'platform', label: 'Billing & plan messages', platform: true },
    platform_invoice:        { group: 'platform', label: 'Invoices', platform: true },
    platform_alert:          { group: 'platform', label: 'Admin alerts', platform: true },
    platform_contact:        { group: 'platform', label: 'Contact & demo replies', platform: true },
    platform_store_fallback: { group: 'platform', label: 'Store owner alert (sent by Bluetick)', platform: true },
    platform_message:        { group: 'platform', label: 'Other Bluetick messages', platform: true },
    // Seen in Meta webhooks but never sent through the gateway (Business Suite, another app, ...)
    external:             { group: 'external', label: 'Sent outside Bluetick', external: true }
};

// Sources used by rows copied from the old tables (MessageBilling / ChatMessage / MessageLog).
const LEGACY_SOURCE_MAP = {
    system: 'platform_message', test: 'gateway_test', ads: 'ctwa_retarget'
};

function getSource(key) {
    const s = SOURCES[key];
    if (!s) throw new Error(`[OUTBOUND] Unknown message source "${key}". Add it to services/outbound/sources.js`);
    return s;
}

function countsTowardPlan(key) {
    const s = getSource(key);
    return !s.platform && !s.external;
}

const groupFor = (key) => {
    const s = SOURCES[key] || SOURCES.external;
    return { key: s.group, label: GROUPS[s.group] };
};

module.exports = { SOURCES, GROUPS, LEGACY_SOURCE_MAP, getSource, countsTowardPlan, groupFor };
