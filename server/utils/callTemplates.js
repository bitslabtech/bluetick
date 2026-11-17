/**
 * Suggested WhatsApp templates for the automatic call messages. The user previews (and may edit)
 * the wording, then we submit it to Meta for them. {{1}} is the caller's first name.
 */
const Template = require('../models/Template');
const elig = require('./callEligibility');

const SUGGESTIONS = {
    missedCallMessage: {
        namePrefix: 'missed_call_followup',
        body: "Hi {{1}}, sorry we missed your call. Reply here and we'll get back to you shortly.",
    },
    closedMessage: {
        namePrefix: 'call_after_hours',
        body: "Hi {{1}}, thanks for calling. We're closed right now. Message us here and we'll reply when we open.",
    },
};

const META_ERR = (e) => e?.error_user_msg || e?.message || 'WhatsApp refused the template';

/** What the app shows in the preview. */
function suggestion(which) {
    const s = SUGGESTIONS[which];
    return s ? { which, body: s.body, sample: 'Alex' } : null;
}

/**
 * Submit a suggested template to Meta (UTILITY; Meta may recategorise) and save it locally.
 * Returns the Template row. Throws Error(message) the app can show.
 */
async function createSuggested(ownerId, settings, which, bodyOverride) {
    const s = SUGGESTIONS[which];
    if (!s) throw new Error('Unknown message');
    if (!settings?.metaBusinessAccountId || !settings?.metaAccessToken) throw new Error('Connect WhatsApp first');

    const body = String(bodyOverride || s.body).trim().slice(0, 1024);
    // {{1}} (the caller name) is optional: a template without it works for every caller.
    const vars = elig.templateVariableCount(body);
    if (vars < 0 || vars > 1) throw new Error('Only {{1}} (the caller name) can be used as a variable');
    if (vars === 1 && /^\s*\{\{|\{\{\s*1\s*\}\}\s*$/.test(body)) throw new Error('Put some words before and after {{1}}');

    // Template names are unique per WhatsApp account: add a short suffix.
    const name = `${s.namePrefix}_${Math.random().toString(36).slice(2, 7)}`;
    const res = await fetch(`https://graph.facebook.com/v21.0/${settings.metaBusinessAccountId}/message_templates`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${settings.metaAccessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name,
            category: 'UTILITY',
            allow_category_change: true,
            language: 'en_US',
            components: [{ type: 'BODY', text: body, ...(vars === 1 ? { example: { body_text: [['Alex']] } } : {}) }],
        }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(META_ERR(data.error));

    return Template.create({
        name, content: body, category: 'UTILITY', language: 'en_US', userId: ownerId,
        status: data.status || 'PENDING', metaTemplateId: data.id, archetype: 'standard', headerType: 'NONE',
    });
}

module.exports = { suggestion, createSuggested, SUGGESTIONS };
