/**
 * Consent to Meta's terms when connecting WhatsApp Business or Meta Ads.
 *
 * The connect screens make the person tick a box that links Meta's terms (client
 * components/MetaConsentCheckbox.jsx). The request carries that tick as
 * `consent: { accepted: true }`; the connect endpoints refuse without it and, once the
 * connection succeeds, write an activity-log entry as evidence of who agreed, when, from
 * which IP and to which documents (the DPDP Act puts the burden of proving consent on us).
 *
 * Keep TERMS_SHOWN in step with the links in MetaConsentCheckbox.jsx, and bump
 * CONSENT_TEXT_VERSION when the wording or links change.
 */
const logActivity = require('./logger');

const CONSENT_TEXT_VERSION = '2026-11-25';

const TERMS_SHOWN = {
    whatsapp: [
        'https://www.whatsapp.com/legal/business-terms/',
        'https://business.whatsapp.com/policy',
        'https://www.facebook.com/privacy/policy/',
    ],
    meta_ads: [
        'https://www.facebook.com/terms.php',
        'https://transparency.meta.com/policies/ad-standards/',
        'https://www.facebook.com/privacy/policy/',
    ],
};

const ACTION = 'Meta Consent Given';
const MISSING_MESSAGE = "Please tick the box to agree to Meta's terms before connecting. If you don't see it, refresh the page.";

/** True when the request says the person ticked the consent box. */
function hasMetaConsent(body) {
    return body?.consent?.accepted === true;
}

/** The activity-log details for this consent: a short sentence, then the full record as JSON. */
function consentDetails(req, product) {
    const record = {
        product,
        acceptedAt: new Date().toISOString(),
        textVersion: CONSENT_TEXT_VERSION,
        termsShown: TERMS_SHOWN[product] || [],
        // For a team member the auth middleware puts the owner's id in req.user.id and their own in realId
        userId: req.user?.realId || req.user?.id || null,
        accountOwnerId: req.user?.id || null,
        isTeamMember: Boolean(req.user?.parentUserId),
        userAgent: String(req.headers?.['user-agent'] || '').slice(0, 300) || null,
    };
    const who = record.isTeamMember ? 'Team member' : 'Account owner';
    const what = product === 'meta_ads' ? 'Meta Ads' : 'WhatsApp Business';
    return `${who} agreed to Meta's terms and connected ${what}. ${JSON.stringify(record)}`;
}

/** Write the evidence entry. Never throws: a logging failure must not undo a working connection. */
async function recordMetaConsent(req, product) {
    try {
        await logActivity(req, ACTION, consentDetails(req, product));
    } catch (err) {
        console.error('[META CONSENT] could not record consent:', err.message);
    }
}

module.exports = { hasMetaConsent, recordMetaConsent, consentDetails, MISSING_MESSAGE, TERMS_SHOWN, CONSENT_TEXT_VERSION, ACTION };
