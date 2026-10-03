const express = require('express');
const router = express.Router();
const axios = require('axios');
const auth = require('../middleware/auth');
const User = require('../models/User');

const GRAPH_API = 'https://graph.facebook.com/v22.0';

/**
 * GET /api/whatsapp/meta-analytics
 * 
 * Fetches all billing-related analytics available to a Tech Provider:
 *  - conversation_analytics  (count + estimated_cost by type/country/day)
 *  - pricing_analytics       (cost per conversation category)
 *  - WABA node               (currency, timezone, billing_country_code, account_review_status)
 *  - Phone number details    (messaging_limit_tier, quality_rating)
 * 
 * Query params:
 *   period  = "7d" | "30d" | "90d"  (default: 30d)
 * 
 * All data is fetched live from Meta — nothing is stored in our DB.
 * 
 * @source https://developers.facebook.com/docs/whatsapp/business-management-api/analytics
 */
router.get('/', auth, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const { fbAccessToken, wabaId } = user;

        if (!fbAccessToken || !wabaId) {
            return res.status(422).json({
                error: 'WhatsApp account not connected',
                detail: 'Please connect your WhatsApp Business Account in Settings first.'
            });
        }

        // ── Date range ────────────────────────────────────────────────────────
        const period = req.query.period || '30d';
        const now = Math.floor(Date.now() / 1000);
        let startTs;
        if (period === '7d')  startTs = now - 7  * 86400;
        else if (period === '90d') startTs = now - 90 * 86400;
        else                  startTs = now - 30 * 86400; // default 30d

        // ── 1. WABA Account Info (currency, billing_country_code, etc.) ───────
        let wabaInfo = {};
        try {
            const wabaRes = await axios.get(`${GRAPH_API}/${wabaId}`, {
                params: {
                    fields: 'id,name,currency,timezone_id,account_review_status,message_template_namespace,business_verification_status',
                    access_token: fbAccessToken
                }
            });
            wabaInfo = wabaRes.data || {};
        } catch (e) {
            console.error('[META-ANALYTICS] WABA info fetch failed:', e.response?.data || e.message);
        }

        // Fallback: if the combined request failed, fetch the currency on its own
        if (!wabaInfo.currency) {
            try {
                const curRes = await axios.get(`${GRAPH_API}/${wabaId}`, {
                    params: { fields: 'id,currency', access_token: fbAccessToken }
                });
                wabaInfo = { ...wabaInfo, ...(curRes.data || {}) };
            } catch (e) {
                console.error('[META-ANALYTICS] WABA currency fallback failed:', e.response?.data || e.message);
            }
        }

        // ── 2. Phone Number Details ───────────────────────────────────────────
        let phoneInfo = {};
        if (user.metaPhoneNumberId) {
            try {
                const phoneRes = await axios.get(`${GRAPH_API}/${user.metaPhoneNumberId}`, {
                    params: {
                        fields: 'id,display_phone_number,quality_rating,messaging_limit_tier,verified_name,name_status,code_verification_status,throughput',
                        access_token: fbAccessToken
                    }
                });
                phoneInfo = phoneRes.data || {};
            } catch (e) {
                console.error('[META-ANALYTICS] Phone info fetch failed:', e.response?.data || e.message);
            }
        }

        // ── 3. conversation_analytics — by type + country, DAILY ─────────────
        // Source: https://developers.facebook.com/docs/whatsapp/business-management-api/analytics
        let conversationAnalytics = null;
        try {
            const convRes = await axios.get(`${GRAPH_API}/${wabaId}`, {
                params: {
                    fields: `conversation_analytics.start(${startTs}).end(${now}).granularity(DAILY).dimensions(CONVERSATION_TYPE,COUNTRY)`,
                    access_token: fbAccessToken
                }
            });
            conversationAnalytics = convRes.data?.conversation_analytics || null;
        } catch (e) {
            console.error('[META-ANALYTICS] conversation_analytics failed:', e.response?.data || e.message);
        }

        // ── 4. pricing_analytics — cost breakdown by type ────────────────────
        let pricingAnalytics = null;
        try {
            const priceRes = await axios.get(`${GRAPH_API}/${wabaId}`, {
                params: {
                    fields: `pricing_analytics.start(${startTs}).end(${now}).granularity(DAILY).dimensions(CONVERSATION_TYPE,COUNTRY)`,
                    access_token: fbAccessToken
                }
            });
            pricingAnalytics = priceRes.data?.pricing_analytics || null;
        } catch (e) {
            console.error('[META-ANALYTICS] pricing_analytics failed:', e.response?.data || e.message);
        }

        // ── 5. messaging analytics — sent/delivered/read counts ──────────────
        let messagingAnalytics = null;
        try {
            const msgRes = await axios.get(`${GRAPH_API}/${wabaId}`, {
                params: {
                    fields: `analytics.start(${startTs}).end(${now}).granularity(DAY).phone_numbers([\"${user.metaPhoneNumberId}\"])`,
                    access_token: fbAccessToken
                }
            });
            messagingAnalytics = msgRes.data?.analytics || null;
        } catch (e) {
            console.error('[META-ANALYTICS] messaging analytics failed:', e.response?.data || e.message);
        }

        return res.json({
            period,
            startTs,
            endTs: now,
            wabaInfo,
            phoneInfo,
            conversationAnalytics,
            pricingAnalytics,
            messagingAnalytics,
            currency: wabaInfo?.currency || 'USD',
        });

    } catch (err) {
        console.error('[META-ANALYTICS] Unexpected error:', err.message);
        return res.status(500).json({ error: 'Failed to fetch Meta analytics data' });
    }
});

module.exports = router;
