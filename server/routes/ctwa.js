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

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/ctwa/leads
// Returns all CTWA-originated contacts (leads) with source ad info.
// Supports ?ad_id= filter and ?search= text search on name/phone.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/leads', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { ad_id, search, page = 1, limit = 50 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        const { Op } = require('sequelize');
        const where = {
            userId,
            ctwaSource: { [Op.ne]: null }
        };

        // Filter by specific ad
        if (ad_id) {
            where.ctwaSource = {
                ...where.ctwaSource,
                source_id: ad_id
            };
            // Use raw query approach for JSONB filtering
        }

        // Search by name or phone
        if (search) {
            where[Op.or] = [
                { name: { [Op.iLike]: `%${search}%` } },
                { phone: { [Op.iLike]: `%${search}%` } }
            ];
        }

        let queryWhere = `"userId" = :userId AND ctwa_source IS NOT NULL`;
        const replacements = { userId, limit: parseInt(limit), offset };

        if (ad_id) {
            queryWhere += ` AND ctwa_source->>'source_id' = :ad_id`;
            replacements.ad_id = ad_id;
        }
        if (search) {
            queryWhere += ` AND (name ILIKE :search OR phone ILIKE :search)`;
            replacements.search = `%${search}%`;
        }

        const { sequelize } = require('../config/database');

        // Get total count
        const [[{ count: totalCount }]] = await sequelize.query(
            `SELECT COUNT(*) as count FROM "Contacts" WHERE ${queryWhere}`,
            { replacements }
        );

        // Get paginated leads
        const [leads] = await sequelize.query(`
            SELECT 
                id, name, phone, email, tags, labels, status,
                ctwa_source AS "ctwaSource",
                "createdAt", "updatedAt"
            FROM "Contacts"
            WHERE ${queryWhere}
            ORDER BY "createdAt" DESC
            LIMIT :limit OFFSET :offset
        `, { replacements });

        // Calculate 72-hour window status for each lead
        const now = new Date();
        const enrichedLeads = leads.map(lead => {
            const createdAt = new Date(lead.createdAt);
            const hoursSinceCreation = (now - createdAt) / (1000 * 60 * 60);
            const windowHoursLeft = Math.max(0, 72 - hoursSinceCreation);
            
            return {
                ...lead,
                windowStatus: windowHoursLeft > 0 ? 'active' : 'expired',
                windowHoursLeft: Math.round(windowHoursLeft * 10) / 10,
                adName: lead.ctwaSource?.headline || 'Unknown Ad',
                adId: lead.ctwaSource?.source_id || null,
            };
        });

        res.json({
            leads: enrichedLeads,
            total: parseInt(totalCount),
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(parseInt(totalCount) / parseInt(limit))
        });

    } catch (err) {
        console.error('[CTWA LEADS ERROR]', err.message);
        res.status(500).json({ error: 'Failed to fetch CTWA leads.' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/ctwa/retarget
// Phase 4: Send a template message to all leads from a specific ad.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/retarget', auth, async (req, res) => {
    try {
        const { adId, templateName } = req.body;
        if (!adId || !templateName) {
            return res.status(400).json({ error: 'adId and templateName are required' });
        }

        const user = await User.findByPk(req.user.id);
        if (!user.whatsappPhoneNumberId || !user.whatsappToken) {
            return res.status(403).json({ error: 'WhatsApp not configured' });
        }

        const { sequelize } = require('../config/database');
        const [leads] = await sequelize.query(`
            SELECT phone, name FROM "Contacts"
            WHERE "userId" = :userId
              AND ctwa_source IS NOT NULL
              AND ctwa_source->>'source_id' = :adId
        `, { replacements: { userId: req.user.id, adId } });

        if (!leads || leads.length === 0) {
            return res.json({ sentCount: 0, message: 'No leads found for this ad' });
        }

        let sentCount = 0;
        let failCount = 0;

        for (const lead of leads) {
            try {
                await axios.post(
                    `https://graph.facebook.com/v22.0/${user.whatsappPhoneNumberId}/messages`,
                    {
                        messaging_product: 'whatsapp',
                        to: lead.phone,
                        type: 'template',
                        template: {
                            name: templateName,
                            language: { code: 'en' }
                        }
                    },
                    {
                        headers: {
                            Authorization: `Bearer ${user.whatsappToken}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );
                sentCount++;
            } catch (err) {
                failCount++;
                console.error(`[RETARGET] Failed to send to ${lead.phone}:`, err?.response?.data?.error?.message || err.message);
            }

            // Rate limit: 50ms between messages
            await new Promise(r => setTimeout(r, 50));
        }

        console.log(`[RETARGET] Ad ${adId}: Sent ${sentCount}/${leads.length}, Failed: ${failCount}`);
        res.json({ sentCount, failCount, total: leads.length });

    } catch (err) {
        console.error('[RETARGET ERROR]', err.message);
        res.status(500).json({ error: 'Failed to send retarget campaign' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET/POST /api/ctwa/capi-config
// Phase 5: Save and load CAPI (Conversions API) configuration.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/capi-config', auth, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);
        const capiConfig = user.capiConfig || {};
        res.json({
            pixelId: capiConfig.pixelId || '',
            accessToken: capiConfig.accessToken ? '••••••••' : '',
            testEventCode: capiConfig.testEventCode || '',
            configured: !!(capiConfig.pixelId && capiConfig.accessToken)
        });
    } catch (err) {
        console.error('[CAPI CONFIG GET ERROR]', err.message);
        res.status(500).json({ error: 'Failed to load CAPI config' });
    }
});

router.post('/capi-config', auth, async (req, res) => {
    try {
        const { pixelId, accessToken, testEventCode } = req.body;
        if (!pixelId || !accessToken) {
            return res.status(400).json({ error: 'Pixel ID and Access Token are required' });
        }

        const user = await User.findByPk(req.user.id);
        
        // Only update accessToken if it's not the masked placeholder
        const existingConfig = user.capiConfig || {};
        const newConfig = {
            pixelId,
            accessToken: accessToken === '••••••••' ? existingConfig.accessToken : accessToken,
            testEventCode: testEventCode || ''
        };

        user.capiConfig = newConfig;
        await user.save();

        console.log(`[CAPI] Config saved for user ${req.user.id}`);
        res.json({ success: true });
    } catch (err) {
        console.error('[CAPI CONFIG POST ERROR]', err.message);
        res.status(500).json({ error: 'Failed to save CAPI config' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/ctwa/capi-test
// Fire a test Lead event to Meta Conversions API.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/capi-test', auth, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);
        const capiConfig = user.capiConfig || {};

        if (!capiConfig.pixelId || !capiConfig.accessToken) {
            return res.status(400).json({ error: 'CAPI not configured. Save your Pixel ID and Access Token first.' });
        }

        const eventData = {
            data: [{
                event_name: 'Lead',
                event_time: Math.floor(Date.now() / 1000),
                action_source: 'system_generated',
                user_data: {
                    client_user_agent: 'BlueTick-CAPI-Test/1.0'
                }
            }]
        };

        if (capiConfig.testEventCode) {
            eventData.test_event_code = capiConfig.testEventCode;
        }

        const capiRes = await axios.post(
            `https://graph.facebook.com/v22.0/${capiConfig.pixelId}/events`,
            eventData,
            {
                params: { access_token: capiConfig.accessToken },
                headers: { 'Content-Type': 'application/json' }
            }
        );

        console.log(`[CAPI TEST] Event sent successfully:`, capiRes.data);
        res.json({ success: true, response: capiRes.data });
    } catch (err) {
        console.error('[CAPI TEST ERROR]', err?.response?.data || err.message);
        res.status(500).json({ 
            error: err?.response?.data?.error?.message || 'Failed to send test event',
            details: err?.response?.data 
        });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Fire CAPI event (used by webhook when CTWA leads arrive)
// ─────────────────────────────────────────────────────────────────────────────
const fireCapiEvent = async (userId, eventName, userData = {}) => {
    try {
        const user = await User.findByPk(userId);
        const capiConfig = user?.capiConfig;
        if (!capiConfig?.pixelId || !capiConfig?.accessToken) return;

        const eventData = {
            data: [{
                event_name: eventName,
                event_time: Math.floor(Date.now() / 1000),
                action_source: 'system_generated',
                user_data: {
                    ...userData,
                    client_user_agent: 'BlueTick-CAPI/1.0'
                }
            }]
        };

        if (capiConfig.testEventCode) {
            eventData.test_event_code = capiConfig.testEventCode;
        }

        await axios.post(
            `https://graph.facebook.com/v22.0/${capiConfig.pixelId}/events`,
            eventData,
            {
                params: { access_token: capiConfig.accessToken },
                headers: { 'Content-Type': 'application/json' }
            }
        );

        console.log(`[CAPI] ${eventName} event fired for user ${userId}`);
    } catch (err) {
        console.error(`[CAPI] Failed to fire ${eventName}:`, err?.response?.data?.error?.message || err.message);
    }
};

module.exports = router;
module.exports.fireCapiEvent = fireCapiEvent;
