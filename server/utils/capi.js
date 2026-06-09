/**
 * Meta Conversions API (CAPI) — Server-Side Event Helper
 *
 * Fires standard Meta conversion events to the CAPI endpoint.
 * Called from wastore.js whenever an order is created or confirmed.
 *
 * Docs: https://developers.facebook.com/docs/marketing-api/conversions-api/
 */

const axios = require('axios');
const crypto = require('crypto');

/** SHA-256 hash a value for PII hashing (Meta requirement) */
const hash = (value) => {
    if (!value) return undefined;
    return crypto.createHash('sha256').update(String(value).trim().toLowerCase()).digest('hex');
};

/**
 * Fire a CAPI event to Meta
 *
 * @param {object} options
 * @param {string}   options.pixelId         - Meta Pixel ID (from user.capiConfig.pixelId)
 * @param {string}   options.accessToken     - CAPI access token (from user.capiConfig.accessToken or user.metaAdsToken)
 * @param {string}   options.eventName       - e.g. 'InitiateCheckout' | 'Purchase' | 'ViewContent'
 * @param {object}   options.eventData       - Event-specific data (value, currency, contents, etc.)
 * @param {object}   [options.userData]      - Customer PII (phone, email) — will be hashed
 * @param {string}   [options.testEventCode] - Optional: from Meta's Event Testing Tool
 * @param {string}   [options.sourceUrl]     - The store URL that triggered the event
 */
const fireCAPIEvent = async ({ pixelId, accessToken, eventName, eventData, userData = {}, testEventCode, sourceUrl }) => {
    if (!pixelId || !accessToken) {
        console.warn('[CAPI] Skipped — pixelId or accessToken not configured.');
        return;
    }

    const eventTime = Math.floor(Date.now() / 1000);

    const payload = {
        data: [
            {
                event_name: eventName,
                event_time: eventTime,
                action_source: 'website',
                event_source_url: sourceUrl || process.env.APP_URL || 'https://app.example.com',

                // PII — always SHA-256 hashed (Meta requirement)
                user_data: {
                    ph: hash(userData.phone),
                    em: hash(userData.email),
                    // You can add more: fn, ln, ct, st, zp, country, external_id, client_ip_address
                },

                // Custom data (order value, currency, items)
                custom_data: {
                    ...eventData,
                },
            }
        ],
    };

    // Attach test event code if provided (for validation in Meta Events Manager)
    if (testEventCode) {
        payload.test_event_code = testEventCode;
    }

    try {
        const response = await axios.post(
            `https://graph.facebook.com/v22.0/${pixelId}/events`,
            payload,
            {
                params: { access_token: accessToken },
                headers: { 'Content-Type': 'application/json' },
                timeout: 8000,
            }
        );
        console.log(`[CAPI] ✅ ${eventName} event sent → Pixel ${pixelId}`, response.data);
        return response.data;
    } catch (err) {
        // Non-blocking — CAPI failures should never break order flow
        console.error(`[CAPI] ❌ Failed to send ${eventName}:`, err.response?.data || err.message);
    }
};

module.exports = { fireCAPIEvent };
