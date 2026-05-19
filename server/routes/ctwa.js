const express = require('express');
const router = express.Router();
const axios = require('axios');
const auth = require('../middleware/auth');
const User = require('../models/User');
const Contact = require('../models/Contact');
const ChatMessage = require('../models/ChatMessage');
const { Sequelize } = require('sequelize');

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/ctwa/auth
// Exchanges a short-lived Facebook User Token (from Frontend FB Login SDK)
// for a Long-Lived User Access Token and saves it to the user's account.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/auth', auth, async (req, res) => {
    try {
        const { accessToken } = req.body;
        if (!accessToken) return res.status(400).json({ error: 'Facebook access token is required' });

        const clientId = process.env.FB_CLIENT_ID;
        const clientSecret = process.env.FB_CLIENT_SECRET;

        if (!clientId || !clientSecret) {
            return res.status(500).json({ error: 'Server Meta App credentials not configured (FB_CLIENT_ID / FB_CLIENT_SECRET)' });
        }

        // Exchange short-lived token for a long-lived token (60 days)
        const tokenRes = await axios.get('https://graph.facebook.com/v22.0/oauth/access_token', {
            params: {
                grant_type: 'fb_exchange_token',
                client_id: clientId,
                client_secret: clientSecret,
                fb_exchange_token: accessToken
            }
        });

        const longLivedToken = tokenRes.data.access_token;
        if (!longLivedToken) throw new Error('Failed to exchange for long-lived token');

        // Save to user model
        const user = await User.findByPk(req.user.id);
        user.metaAdsToken = longLivedToken;
        await user.save();

        console.log(`[CTWA] Long-lived token saved for user ${req.user.id}`);
        res.json({ success: true, message: 'Facebook Ads account connected successfully.' });

    } catch (err) {
        console.error('[CTWA AUTH ERROR]', err?.response?.data || err.message);
        res.status(500).json({
            error: 'Failed to connect Facebook Ads account.',
            details: err?.response?.data?.error?.message || err.message
        });
    }
});


// ─────────────────────────────────────────────────────────────────────────────
// GET /api/ctwa/ad-accounts
// Lists all Ad Accounts the connected user owns/has access to.
// User will select which account runs their CTWA campaigns.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/ad-accounts', auth, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);
        if (!user.metaAdsToken) {
            return res.status(403).json({ error: 'No Meta Ads account connected. Please connect via Facebook Login first.' });
        }

        const meRes = await axios.get('https://graph.facebook.com/v22.0/me/adaccounts', {
            params: {
                fields: 'id,name,account_status,currency,business',
                access_token: user.metaAdsToken,
                limit: 50
            }
        });

        const accounts = meRes.data?.data || [];

        res.json({
            accounts: accounts.map(acc => ({
                id: acc.id,           // e.g. "act_123456789"
                name: acc.name,
                currency: acc.currency,
                status: acc.account_status === 1 ? 'active' : 'inactive',
                businessName: acc.business?.name || null
            }))
        });

    } catch (err) {
        console.error('[CTWA AD-ACCOUNTS ERROR]', err?.response?.data || err.message);
        res.status(500).json({
            error: 'Failed to fetch Ad Accounts from Meta.',
            details: err?.response?.data?.error?.message || err.message
        });
    }
});


// ─────────────────────────────────────────────────────────────────────────────
// POST /api/ctwa/select-account
// Saves the user's chosen Ad Account ID.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/select-account', auth, async (req, res) => {
    try {
        const { adAccountId } = req.body;
        if (!adAccountId) return res.status(400).json({ error: 'adAccountId is required' });

        const user = await User.findByPk(req.user.id);
        user.metaAdAccountId = adAccountId;
        await user.save();

        res.json({ success: true, message: `Ad account ${adAccountId} selected.` });
    } catch (err) {
        console.error('[CTWA SELECT-ACCOUNT ERROR]', err.message);
        res.status(500).json({ error: 'Failed to save Ad Account selection.' });
    }
});


// ─────────────────────────────────────────────────────────────────────────────
// GET /api/ctwa/status
// Returns the current CTWA connection status for the user dashboard.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/status', auth, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);
        res.json({
            connected: !!user.metaAdsToken,
            adAccountId: user.metaAdAccountId || null
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch CTWA status.' });
    }
});


// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/ctwa/disconnect
// Revokes the CTWA Ads connection.
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/disconnect', auth, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);
        user.metaAdsToken = null;
        user.metaAdAccountId = null;
        user.metaBusinessId = null;
        await user.save();
        res.json({ success: true, message: 'Meta Ads account disconnected.' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to disconnect.' });
    }
});


// ─────────────────────────────────────────────────────────────────────────────
// GET /api/ctwa/dashboard
// The core analytics endpoint. Merges:
//   1. LOCAL DB: Count of CTWA leads (Contacts with ctwaSource) per Ad ID
//   2. META API: Spend, clicks, impressions per Ad ID via Ads Insights API
// Returns a merged analytics table the frontend will render.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/dashboard', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findByPk(userId);

        if (!user.metaAdsToken || !user.metaAdAccountId) {
            return res.status(403).json({
                error: 'Not configured. Please connect your Facebook Ad Account first.',
                needsSetup: true
            });
        }

        // ── Step 1: Aggregate local CTWA leads from Contacts ──
        const { sequelize } = require('../config/database');
        const [localLeads] = await sequelize.query(`
            SELECT 
                ctwa_source->>'source_id' AS ad_id,
                ctwa_source->>'headline' AS headline,
                ctwa_source->>'image_url' AS image_url,
                ctwa_source->>'source_url' AS source_url,
                COUNT(*) AS lead_count
            FROM "Contacts"
            WHERE "userId" = :userId
              AND ctwa_source IS NOT NULL
              AND ctwa_source->>'source_id' IS NOT NULL
            GROUP BY ad_id, headline, image_url, source_url
            ORDER BY lead_count DESC
        `, { replacements: { userId }, type: Sequelize.QueryTypes.SELECT });

        if (!localLeads || localLeads.length === 0) {
            return res.json({ ads: [], totalLeads: 0, totalSpend: 0 });
        }

        const adIds = localLeads.map(l => l.ad_id).filter(Boolean);

        // ── Step 2: Fetch Ad Spend from Meta Ads Insights API ──
        let metaInsights = {};
        try {
            const dateRange = req.query.dateRange || 'last_30d';

            // Build date preset mapping
            const presetMap = {
                'last_7d': 'last_7_days',
                'last_30d': 'last_30_days',
                'last_14d': 'last_14_days',
                'this_month': 'this_month',
                'last_month': 'last_month'
            };
            const datePreset = presetMap[dateRange] || 'last_30_days';

            const insightsRes = await axios.get(
                `https://graph.facebook.com/v22.0/${user.metaAdAccountId}/insights`,
                {
                    params: {
                        fields: 'ad_id,ad_name,spend,impressions,clicks,actions,cost_per_action_type',
                        level: 'ad',
                        date_preset: datePreset,
                        filtering: JSON.stringify([{
                            field: 'ad.id',
                            operator: 'IN',
                            value: adIds
                        }]),
                        access_token: user.metaAdsToken,
                        limit: 100
                    }
                }
            );

            const insightsData = insightsRes.data?.data || [];
            for (const insight of insightsData) {
                metaInsights[insight.ad_id] = {
                    spend: parseFloat(insight.spend || 0),
                    impressions: parseInt(insight.impressions || 0),
                    clicks: parseInt(insight.clicks || 0),
                    ad_name: insight.ad_name
                };
            }

            console.log(`[CTWA DASHBOARD] Fetched ${insightsData.length} Ad Insights from Meta.`);
        } catch (metaErr) {
            console.error('[CTWA DASHBOARD] Meta Insights fetch failed (non-fatal):', metaErr?.response?.data || metaErr.message);
            // Continue with local data only — don't fail the whole dashboard
        }

        // ── Step 3: Merge local leads + Meta insights ──
        let totalSpend = 0;
        let totalLeads = 0;

        const ads = localLeads.map(lead => {
            const insight = metaInsights[lead.ad_id] || {};
            const leads = parseInt(lead.lead_count);
            const spend = insight.spend || 0;
            const costPerLead = spend > 0 && leads > 0 ? (spend / leads).toFixed(2) : null;

            totalSpend += spend;
            totalLeads += leads;

            return {
                adId: lead.ad_id,
                adName: insight.ad_name || lead.headline || `Ad #${lead.ad_id}`,
                headline: lead.headline,
                imageUrl: lead.image_url,
                sourceUrl: lead.source_url,
                leads,
                spend,
                impressions: insight.impressions || 0,
                clicks: insight.clicks || 0,
                costPerLead: costPerLead ? parseFloat(costPerLead) : null,
                ctr: insight.impressions > 0
                    ? ((insight.clicks / insight.impressions) * 100).toFixed(2)
                    : null
            };
        });

        res.json({
            ads,
            totalLeads,
            totalSpend: parseFloat(totalSpend.toFixed(2)),
            adAccountId: user.metaAdAccountId,
            currency: 'USD' // TODO: fetch from ad account details
        });

    } catch (err) {
        console.error('[CTWA DASHBOARD ERROR]', err.message);
        res.status(500).json({ error: 'Failed to load CTWA Dashboard data.' });
    }
});

module.exports = router;
