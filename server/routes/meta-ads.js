const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const MetaAdCampaign = require('../models/MetaAdCampaign');
const User = require('../models/User');
const SystemConfig = require('../models/SystemConfig');
const AiTokenLog = require('../models/AiTokenLog');
const axios = require('axios');
const { Op } = require('sequelize');

// Helper to retry axios post requests on 429 errors
async function axiosPostWithRetry(url, payload, maxRetries = 3) {
    for (let i = 0; i <= maxRetries; i++) {
        try {
            return await axios.post(url, payload);
        } catch (error) {
            if (error.response && error.response.status === 429 && i < maxRetries) {
                const waitTime = Math.pow(2, i) * 1500 + Math.random() * 1000; // Exponential backoff with jitter
                console.warn(`[AI-API] 429 Rate Limit hit. Retrying in ${Math.round(waitTime)}ms... (Attempt ${i + 1}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            } else {
                throw error;
            }
        }
    }
}

router.use(auth);

// GET all campaigns (includes cached insights)
router.get('/', async (req, res) => {
    try {
        const campaigns = await MetaAdCampaign.findAll({
            where: { userId: req.user.id },
            order: [['createdAt', 'DESC']]
        });
        // Include insights data in each campaign for the frontend
        const enriched = campaigns.map(c => {
            const plain = c.toJSON();
            const ins = plain.insights || {};
            return {
                ...plain,
                impressions: ins.impressions || null,
                clicks: ins.clicks || null,
                spend: ins.spend || null,
                ctr: ins.ctr || null,
                cpc: ins.cpc || null,
                reach: ins.reach || null,
                insightsUpdatedAt: ins.updatedAt || null
            };
        });
        res.json(enriched);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST to generate AI Research (Audience & Targeting)
router.post('/ai-research', async (req, res) => {
    const { businessDescription, targetLocations } = req.body;
    try {
        if (!businessDescription) return res.status(400).json({ error: 'Business description is required' });

        const user = await User.findByPk(req.user.id);
        const sysConfig = await SystemConfig.getConfig();
        const multiplier = sysConfig?.settings?.aiTokenMultipliers?.ai_meta_ads_builder ?? 5;
        const BASE_COST = 20; 
        const finalCost = Math.ceil(BASE_COST * multiplier);

        if (user.aiTokenBalance < finalCost) {
            return res.status(402).json({ error: `Insufficient AI tokens. Required: ${finalCost}` });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY is not configured.' });

        const aiModel = sysConfig?.settings?.aiModel || 'gemini-2.0-flash';

        // Build location instruction — user-specified locations are a hard rule, not a suggestion
        const locationInstruction = targetLocations && targetLocations.length > 0
            ? `IMPORTANT: The user has specified they want to target ONLY these locations: ${targetLocations.join(', ')}. Use EXACTLY these locations in the "locations" array. Do not add, remove, or change them.`
            : `Recommend 3-5 relevant locations based on the business description.`;

        const systemInstruction = `You are an expert Meta Ads Strategist.
The user is providing a description of their business/product.
Your job is to recommend the best targeting for a Click-to-WhatsApp (CTWA) ad campaign to maximize ROI.

${locationInstruction}

Output ONLY a single VALID JSON object. NO markdown. NO code fences. NO extra text before or after.
Keep the "interests" array to a maximum of 6 items.
Keep the "ai_strategy_note" under 60 words.
Schema:
{
  "age_min": 18,
  "age_max": 65,
  "interests": ["string"],
  "locations": ["string"],
  "ai_strategy_note": "string"
}`;

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${aiModel}:generateContent?key=${apiKey}`;
        const payload = {
            systemInstruction: { parts: [{ text: systemInstruction }] },
            contents: [{ role: 'user', parts: [{ text: businessDescription }] }],
            generationConfig: { 
                temperature: 0.5, 
                maxOutputTokens: 2048,
                responseMimeType: "application/json"
            }
        };

        const aiRes = await axiosPostWithRetry(url, payload);
        const candidate = aiRes.data.candidates?.[0];
        let replyText = candidate?.content?.parts?.[0]?.text || '';
        
        if (!replyText) {
            console.error('Empty response from AI. Candidate:', JSON.stringify(candidate));
            return res.status(500).json({ error: 'AI returned an empty response. It might have been blocked by safety filters.', details: candidate });
        }

        replyText = replyText.replace(/```(json)?/gi, '').replace(/```/gi, '').trim();
        
        // Try to extract JSON if there's surrounding text
        const jsonMatch = replyText.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
        if (jsonMatch) {
            replyText = jsonMatch[0];
        }

        let generatedSpec;
        try {
            generatedSpec = JSON.parse(replyText);
        } catch (e) {
            console.error('Failed to parse AI response:', replyText);
            return res.status(500).json({ error: 'AI generated invalid structure.', details: replyText });
        }

        await user.decrement('aiTokenBalance', { by: finalCost });
        const newBal = (user.aiTokenBalance - finalCost);

        try {
            await AiTokenLog.create({
                userId: req.user.id,
                feature: 'ai_meta_ads_research',
                tokensUsed: finalCost,
                balanceAfter: Math.max(0, newBal)
            });
        } catch (e) { console.warn(e); }

        res.json({
            research: generatedSpec,
            tokensDeducted: finalCost,
            newBalance: newBal
        });
    } catch (err) {
        console.error('Error generating AI research:', err);
        res.status(500).json({ error: 'Failed to communicate with AI.' });
    }
});

// POST to generate AI Copy
router.post('/ai-copy', async (req, res) => {
    const { businessDescription, tone, language } = req.body;
    try {
        if (!businessDescription) return res.status(400).json({ error: 'Business description is required' });

        const user = await User.findByPk(req.user.id);
        const sysConfig = await SystemConfig.getConfig();
        const multiplier = sysConfig?.settings?.aiTokenMultipliers?.ai_meta_ads_builder ?? 5;
        const BASE_COST = 10; 
        const finalCost = Math.ceil(BASE_COST * multiplier);

        if (user.aiTokenBalance < finalCost) {
            return res.status(402).json({ error: `Insufficient AI tokens. Required: ${finalCost}` });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        const aiModel = sysConfig?.settings?.aiModel || 'gemini-2.0-flash';

        // Language-specific instructions for Indian market
        const langMap = {
            english: 'English',
            hinglish: 'Hinglish (a mix of Hindi and English, casual tone using Roman script)',
            hindi: 'Hindi (Devanagari script हिंदी)',
            tamil: 'Tamil (தமிழ் script)',
            telugu: 'Telugu (తెలుగు script)',
            bengali: 'Bengali (বাংলা script)',
            marathi: 'Marathi (मराठी Devanagari script)',
            kannada: 'Kannada (ಕನ್ನಡ script)',
            malayalam: 'Malayalam (മലയാളം script)',
            gujarati: 'Gujarati (ગુજરાતી script)',
            punjabi: 'Punjabi (ਪੰਜਾਬੀ Gurmukhi script)',
            urdu: 'Urdu (اردو script)'
        };
        const targetLang = langMap[language] || 'English';

        const systemInstruction = `You are a direct-response copywriter for Meta Ads targeting the Indian market.
The user wants ad copy to drive messages to their WhatsApp.
Tone: ${tone || 'Persuasive and professional'}.

IMPORTANT: Generate all ad copy (primary_text and headline) in ${targetLang}.
${language !== 'english' ? `Use natural, colloquial ${targetLang} that resonates with local audiences. Include appropriate emojis.` : 'Use emojis for engagement.'}

Output STRICTLY VALID JSON. NO MARKDOWN. NO COMMENTS.
Provide 3 variations.
Schema:
{
  "variations": [
    {
      "primary_text": "string (Main ad text in ${targetLang})",
      "headline": "string (Short, punchy headline in ${targetLang})"
    }
  ]
}`;


        const url = `https://generativelanguage.googleapis.com/v1beta/models/${aiModel}:generateContent?key=${process.env.GEMINI_API_KEY}`;
        const payload = {
            systemInstruction: { parts: [{ text: systemInstruction }] },
            contents: [{ role: 'user', parts: [{ text: businessDescription }] }],
            generationConfig: { 
                temperature: 0.8, 
                maxOutputTokens: 2048,
                responseMimeType: "application/json"
            }
        };

        const aiRes = await axiosPostWithRetry(url, payload);
        const candidate = aiRes.data.candidates?.[0];
        let replyText = candidate?.content?.parts?.[0]?.text || '';

        if (!replyText) {
            console.error('Empty response from AI. Candidate:', JSON.stringify(candidate));
            return res.status(500).json({ error: 'AI returned an empty response. It might have been blocked by safety filters.', details: candidate });
        }

        replyText = replyText.replace(/```(json)?/gi, '').replace(/```/gi, '').trim();
        
        // Try to extract JSON if there's surrounding text
        const jsonMatch = replyText.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
        if (jsonMatch) {
            replyText = jsonMatch[0];
        }

        let generatedCopy;
        try {
            generatedCopy = JSON.parse(replyText);
        } catch (e) {
            console.error('Failed to parse AI response:', replyText);
            return res.status(500).json({ error: 'AI generated invalid structure.', details: replyText });
        }

        await user.decrement('aiTokenBalance', { by: finalCost });
        const newBal = (user.aiTokenBalance - finalCost);

        try {
            await AiTokenLog.create({
                userId: req.user.id,
                feature: 'ai_meta_ads_copy',
                tokensUsed: finalCost,
                balanceAfter: Math.max(0, newBal)
            });
        } catch (e) { console.warn(e); }

        res.json({
            copy: generatedCopy,
            tokensDeducted: finalCost,
            newBalance: newBal
        });
    } catch (err) {
        console.error('Error generating AI copy:', err);
        res.status(500).json({ error: 'Failed to communicate with AI.' });
    }
});

// POST to generate AI Image
router.post('/ai-image', async (req, res) => {
    const { businessDescription } = req.body;
    try {
        if (!businessDescription) return res.status(400).json({ error: 'Business description is required' });

        const user = await User.findByPk(req.user.id);
        const sysConfig = await SystemConfig.getConfig();
        const multiplier = sysConfig?.settings?.aiTokenMultipliers?.ai_meta_ads_builder ?? 5;
        const BASE_COST = 50; // Image generation is inherently more expensive
        const finalCost = Math.ceil(BASE_COST * multiplier);

        if (user.aiTokenBalance < finalCost) {
            return res.status(402).json({ error: `Insufficient AI tokens. Required: ${finalCost}` });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY is not configured.' });

        const prompt = `A professional, wide-aspect advertisement image for the following business. 
No text or typography in the image. High definition, commercial photography style, direct response ad style.
Business Info: ${businessDescription}`;

        const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=${apiKey}`;
        const payload = {
            instances: [
                { prompt: prompt }
            ],
            parameters: {
                sampleCount: 1,
                aspectRatio: "1:1"
            }
        };

        const aiRes = await axiosPostWithRetry(url, payload);
        const base64Image = aiRes.data.predictions?.[0]?.bytesBase64Encoded;
        
        if (!base64Image) {
             return res.status(500).json({ error: 'AI failed to return an image' });
        }

        await user.decrement('aiTokenBalance', { by: finalCost });
        const newBal = (user.aiTokenBalance - finalCost);

        try {
            await AiTokenLog.create({
                userId: req.user.id,
                feature: 'ai_meta_ads_image',
                tokensUsed: finalCost,
                balanceAfter: Math.max(0, newBal)
            });
        } catch (e) { console.warn(e); }

        res.json({
            imageUrl: `data:image/jpeg;base64,${base64Image}`,
            tokensDeducted: finalCost,
            newBalance: newBal
        });
    } catch (err) {
        console.error('Error generating AI image:', err.response?.data || err.message);
        res.status(500).json({ error: 'Failed to communicate with AI for image generation.' });
    }
});

// POST save / publish ad campaign
router.post('/publish', async (req, res) => {
    try {
        const {
            campaignName, objective, dailyBudget,
            targeting, creatives, imageUrl, automation,
            scheduling // { startDate, endDate }
        } = req.body;
        const user = await User.findByPk(req.user.id);
        
        let fbStatus = 'Draft';
        let campRes = null;
        let adSetRes = null;

        if (user.metaAdsToken && user.metaAdAccountId) {
            try {
                const fbAdAccountId = user.metaAdAccountId;
                const token = user.metaAdsToken;

                // 1. Create Campaign
                campRes = await axios.post(`https://graph.facebook.com/v22.0/${fbAdAccountId}/campaigns`, null, {
                    params: {
                        name: campaignName,
                        objective: objective || 'OUTCOME_ENGAGEMENT',
                        status: 'ACTIVE',
                        special_ad_categories: JSON.stringify([]),
                        is_adset_budget_sharing_enabled: false,
                        access_token: token
                    }
                });
                const campaignId = campRes.data.id;

                // ── Build geo_locations ────────────────────────────────
                // Prefer Meta location keys (from LocationSearchInput) for exact matching
                const userLocations = targeting?.locations || [];
                const locationKeys  = targeting?.locationKeys || [];

                let geoLocations;
                if (locationKeys.length > 0) {
                    // Categorise keys by type from the stored location objects
                    const locObjects = targeting?.locationObjects || [];
                    const countries  = locObjects.filter(l => l.type === 'country').map(l => l.countryCode || l.key);
                    const regions    = locObjects.filter(l => l.type === 'region').map(l => ({ key: l.key, name: l.name, country: l.countryCode }));
                    const cities     = locObjects.filter(l => l.type === 'city').map(l => ({ key: l.key, name: l.name, country: l.countryCode, region: l.region }));
                    const zips       = locObjects.filter(l => l.type === 'zip').map(l => ({ key: l.key }));

                    geoLocations = {};
                    if (countries.length > 0)  geoLocations.countries = countries;
                    if (regions.length > 0)    geoLocations.regions   = regions;
                    if (cities.length > 0)     geoLocations.cities    = cities;
                    if (zips.length > 0)       geoLocations.zips      = zips;
                    if (Object.keys(geoLocations).length === 0) geoLocations = { countries: ['IN'] };
                } else if (userLocations.length > 0) {
                    // Fallback: name-based (less precise)
                    geoLocations = { cities: userLocations.map(loc => ({ name: typeof loc === 'string' ? loc : loc.name })) };
                } else {
                    geoLocations = { countries: ['IN'] };
                }

                // ── Build interests (flexible_spec) ───────────────────
                const userInterests = targeting?.interests || [];
                const flexibleSpec = userInterests.length > 0
                    ? [{ interests: userInterests.map(name => ({ name })) }]
                    : undefined;

                // ── Build genders array (Meta: 1=male, 2=female, omit=all) ─
                let gendersArr = undefined;
                if (targeting?.gender === 'male')   gendersArr = [1];
                if (targeting?.gender === 'female')  gendersArr = [2];

                // ── Build locales (language targeting) ─────────────────
                // Meta locale IDs — common ones
                const LOCALE_MAP = { en: 6, hi: 23, mr: 45, gu: 20, ta: 57, te: 59, kn: 33, ml: 42, bn: 12, ar: 28, pa: 51, ur: 67 };
                let localesArr = undefined;
                if (targeting?.targetingLanguage && LOCALE_MAP[targeting.targetingLanguage]) {
                    localesArr = [LOCALE_MAP[targeting.targetingLanguage]];
                }

                // ── Build placement (publisher_platforms) ──────────────
                const placements = targeting?.placements || ['facebook', 'instagram'];
                const publisherPlatforms = placements.filter(p => ['facebook', 'instagram', 'audience_network', 'messenger'].includes(p));
                const facebookPositions  = placements.includes('facebook')   ? (targeting?.fbPositions   || ['feed', 'facebook_reels']) : undefined;
                const instagramPositions = placements.includes('instagram')  ? (targeting?.igPositions   || ['stream', 'reels'])        : undefined;

                // ── Build full targeting spec ─────────────────────────
                const targetingSpec = {
                    age_max: targeting?.age_max || 65,
                    age_min: targeting?.age_min || 18,
                    geo_locations: geoLocations,
                    ...(gendersArr          && { genders: gendersArr }),
                    ...(localesArr          && { locales: localesArr }),
                    ...(flexibleSpec        && { flexible_spec: flexibleSpec }),
                    ...(publisherPlatforms.length > 0 && { publisher_platforms: publisherPlatforms }),
                    ...(facebookPositions   && { facebook_positions: facebookPositions }),
                    ...(instagramPositions  && { instagram_positions: instagramPositions }),
                };

                // ── Build AdSet params — resolve Page ID (multi-strategy) ──
                let pageId = user.metaPageId || req.body.fbPageId || null;

                if (!pageId) {
                    console.log(`[META-ADS] Attempting to auto-resolve Facebook Page ID for user ${req.user.id}...`);
                    let resolvedPageId = null;
                    let resolveError = null;

                    // Strategy 1: /me/accounts — personal pages
                    if (!resolvedPageId) {
                        try {
                            const pagesRes = await axios.get('https://graph.facebook.com/v22.0/me/accounts', {
                                params: { access_token: token, fields: 'id,name', limit: 10 }
                            });
                            if (pagesRes.data?.data?.length > 0) {
                                resolvedPageId = pagesRes.data.data[0].id;
                                console.log(`[META-ADS] Strategy 1 (me/accounts): Found page ${resolvedPageId}`);
                            }
                        } catch (e) {
                            resolveError = e.response?.data?.error?.message || e.message;
                            console.warn(`[META-ADS] Strategy 1 (me/accounts) failed: ${resolveError}`);
                        }
                    }

                    // Strategy 2: /me/businesses → owned_pages (Business Manager)
                    if (!resolvedPageId) {
                        try {
                            const bizRes = await axios.get('https://graph.facebook.com/v22.0/me/businesses', {
                                params: { access_token: token, fields: 'id,name', limit: 5 }
                            });
                            const businesses = bizRes.data?.data || [];
                            for (const biz of businesses) {
                                if (resolvedPageId) break;
                                try {
                                    const pagesRes = await axios.get(`https://graph.facebook.com/v22.0/${biz.id}/owned_pages`, {
                                        params: { access_token: token, fields: 'id,name', limit: 5 }
                                    });
                                    if (pagesRes.data?.data?.length > 0) {
                                        resolvedPageId = pagesRes.data.data[0].id;
                                        console.log(`[META-ADS] Strategy 2 (Business Manager ${biz.id}): Found page ${resolvedPageId}`);
                                    }
                                } catch (e2) {
                                    console.warn(`[META-ADS] Strategy 2 inner (biz ${biz.id}) failed:`, e2.message);
                                }
                            }
                        } catch (e) {
                            console.warn(`[META-ADS] Strategy 2 (/me/businesses) failed:`, e.response?.data?.error?.message || e.message);
                        }
                    }

                    // Strategy 3: Try via Ad Account → connected Facebook Page
                    if (!resolvedPageId && user.metaAdAccountId) {
                        try {
                            const actRes = await axios.get(`https://graph.facebook.com/v22.0/${user.metaAdAccountId}`, {
                                params: { access_token: token, fields: 'id,name,business' }
                            });
                            const businessId = actRes.data?.business?.id;
                            if (businessId) {
                                const pagesRes = await axios.get(`https://graph.facebook.com/v22.0/${businessId}/owned_pages`, {
                                    params: { access_token: token, fields: 'id,name', limit: 5 }
                                });
                                if (pagesRes.data?.data?.length > 0) {
                                    resolvedPageId = pagesRes.data.data[0].id;
                                    console.log(`[META-ADS] Strategy 3 (Ad Account business): Found page ${resolvedPageId}`);
                                }
                            }
                        } catch (e) {
                            console.warn(`[META-ADS] Strategy 3 (Ad Account business) failed:`, e.response?.data?.error?.message || e.message);
                        }
                    }

                    if (resolvedPageId) {
                        pageId = resolvedPageId;
                        // Cache for future use
                        user.metaPageId = pageId;
                        await user.save();
                    } else {
                        // All strategies failed — surface a helpful message
                        throw new Error(
                            'No Facebook Page found on your account. Please ensure: ' +
                            '(1) Your Meta token has pages_show_list permission, ' +
                            '(2) You have admin access to a Facebook Page in your Business Manager, ' +
                            'or (3) Provide your Page ID manually in Settings → Meta Ads.'
                        );
                    }
                }


                const { budgetType, lifetimeBudget } = req.body;
                const isLifetime = budgetType === 'lifetime';

                const adSetParams = {
                    name: `${campaignName} - AdSet`,
                    campaign_id: campaignId,
                    billing_event: 'IMPRESSIONS',
                    optimization_goal: 'REPLIES',
                    promoted_object: JSON.stringify({ page_id: pageId }),
                    targeting: JSON.stringify(targetingSpec),
                    status: 'ACTIVE',
                    access_token: token
                };

                if (isLifetime) {
                    // Lifetime budget: fixed total, requires end_time
                    adSetParams.lifetime_budget = Math.round((lifetimeBudget || 3000) * 100);
                } else {
                    // Daily budget (default)
                    adSetParams.daily_budget = Math.round(dailyBudget * 100);
                }

                // ── Ad Scheduling ──────────────────────────────────────
                if (scheduling?.startDate) {
                    adSetParams.start_time = Math.floor(new Date(scheduling.startDate).getTime() / 1000);
                }
                if (scheduling?.endDate) {
                    adSetParams.end_time = Math.floor(new Date(scheduling.endDate).getTime() / 1000);
                } else if (isLifetime) {
                    // Lifetime budget REQUIRES an end_time — default to 30 days from now
                    const defaultEnd = new Date();
                    defaultEnd.setDate(defaultEnd.getDate() + 30);
                    adSetParams.end_time = Math.floor(defaultEnd.getTime() / 1000);
                }

                // 2. Create AdSet
                adSetRes = await axios.post(`https://graph.facebook.com/v22.0/${fbAdAccountId}/adsets`, null, {
                    params: adSetParams
                }).catch(e => {
                    console.warn('[META-ADS] AdSet creation warning:', e.response?.data?.error?.message || e.message);
                    return { data: { id: null } };
                });

                fbStatus = adSetRes.data.id ? 'Active' : 'Draft';
            } catch (graphAPIError) {
                console.error('Graph API Publish Error:', graphAPIError.response?.data || graphAPIError.message);
                fbStatus = 'Error';
            }
        }

        const campaign = await MetaAdCampaign.create({
            userId: req.user.id,
            campaignName,
            objective,
            dailyBudget,
            targeting,
            creatives: { ...creatives, imageUrl, automation: automation || null },
            status: fbStatus,
            metaCampaignId: (fbStatus === 'Active' || fbStatus === 'Draft') ? (campRes?.data?.id || null) : null,
            metaAdsetId:    (fbStatus === 'Active' || fbStatus === 'Draft') ? (adSetRes?.data?.id || null) : null
        });

        res.json({ success: true, campaign });
    } catch (err) {
        console.error('Publish error:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET /insights — Fetch live insights from Facebook Graph API and cache them
router.get('/insights', async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);
        const { range = 'last_30d' } = req.query;

        const datePresetMap = {
            '1d': 'today',
            '7d': 'last_7d',
            '30d': 'last_30d',
            '3m': 'last_90d'
        };
        const datePreset = datePresetMap[range] || 'last_30d';

        const campaigns = await MetaAdCampaign.findAll({
            where: { userId: req.user.id },
            order: [['createdAt', 'DESC']]
        });

        const hasToken = user.metaAdsToken && user.metaAdAccountId;
        const results = [];
        let totalImpressions = 0, totalClicks = 0, totalSpend = 0;

        for (const campaign of campaigns) {
            const plain = campaign.toJSON();
            let insights = plain.insights || {};

            if (hasToken && campaign.metaCampaignId) {
                try {
                    const fbRes = await axios.get(
                        `https://graph.facebook.com/v22.0/${campaign.metaCampaignId}/insights`,
                        {
                            params: {
                                fields: 'impressions,clicks,spend,ctr,cpc,reach,frequency',
                                date_preset: datePreset,
                                access_token: user.metaAdsToken
                            }
                        }
                    );

                    const fbData = fbRes.data?.data?.[0] || {};
                    insights = {
                        impressions: parseInt(fbData.impressions || 0),
                        clicks:      parseInt(fbData.clicks || 0),
                        spend:       parseFloat(fbData.spend || 0),
                        ctr:         fbData.ctr       ? parseFloat(fbData.ctr).toFixed(2)       : '0.00',
                        cpc:         fbData.cpc       ? parseFloat(fbData.cpc).toFixed(2)       : '0.00',
                        reach:       parseInt(fbData.reach || 0),
                        frequency:   fbData.frequency ? parseFloat(fbData.frequency).toFixed(2) : '0.00',
                        updatedAt:   new Date().toISOString()
                    };

                    campaign.insights = insights;
                    await campaign.save();
                } catch (fbErr) {
                    console.error(`[META-ADS] Insights fetch failed for ${campaign.metaCampaignId}:`, fbErr.response?.data?.error?.message || fbErr.message);
                }
            }

            totalImpressions += parseInt(insights.impressions || 0);
            totalClicks      += parseInt(insights.clicks || 0);
            totalSpend       += parseFloat(insights.spend || 0);

            results.push({
                id:              plain.id,
                campaignName:    plain.campaignName,
                objective:       plain.objective,
                dailyBudget:     plain.dailyBudget,
                status:          plain.status,
                metaCampaignId:  plain.metaCampaignId,
                createdAt:       plain.createdAt,
                impressions:     insights.impressions || null,
                clicks:          insights.clicks      || null,
                spend:           insights.spend       || null,
                ctr:             insights.ctr         || null,
                cpc:             insights.cpc         || null,
                reach:           insights.reach       || null,
                frequency:       insights.frequency   || null,
                insightsUpdatedAt: insights.updatedAt || null
            });
        }

        const avgCtr = totalImpressions > 0
            ? ((totalClicks / totalImpressions) * 100).toFixed(2)
            : '0.00';

        res.json({
            summary: {
                totalCampaigns: campaigns.length,
                totalImpressions,
                totalClicks,
                totalSpend: parseFloat(totalSpend.toFixed(2)),
                avgCtr,
                hasLiveConnection: !!hasToken
            },
            campaigns: results
        });
    } catch (err) {
        console.error('Meta Ads Insights Error:', err);
        res.status(500).json({ error: err.message });
    }

});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/meta-ads/location-search?q=Mumbai&type=city
// Proxy to Meta Targeting Search API — returns valid geo locations for ad targeting
// Falls back to a curated list if no Meta token is configured
// ─────────────────────────────────────────────────────────────────────────────
const FALLBACK_LOCATIONS = [
    // India — Tier 1
    { key: 'IN', name: 'India', type: 'country', countryCode: 'IN', countryName: 'India' },
    { key: 'Mumbai', name: 'Mumbai', type: 'city', countryCode: 'IN', countryName: 'India', region: 'Maharashtra' },
    { key: 'Delhi', name: 'Delhi', type: 'city', countryCode: 'IN', countryName: 'India', region: 'Delhi' },
    { key: 'Bangalore', name: 'Bangalore', type: 'city', countryCode: 'IN', countryName: 'India', region: 'Karnataka' },
    { key: 'Hyderabad', name: 'Hyderabad', type: 'city', countryCode: 'IN', countryName: 'India', region: 'Telangana' },
    { key: 'Chennai', name: 'Chennai', type: 'city', countryCode: 'IN', countryName: 'India', region: 'Tamil Nadu' },
    { key: 'Kolkata', name: 'Kolkata', type: 'city', countryCode: 'IN', countryName: 'India', region: 'West Bengal' },
    { key: 'Pune', name: 'Pune', type: 'city', countryCode: 'IN', countryName: 'India', region: 'Maharashtra' },
    { key: 'Ahmedabad', name: 'Ahmedabad', type: 'city', countryCode: 'IN', countryName: 'India', region: 'Gujarat' },
    { key: 'Jaipur', name: 'Jaipur', type: 'city', countryCode: 'IN', countryName: 'India', region: 'Rajasthan' },
    { key: 'Surat', name: 'Surat', type: 'city', countryCode: 'IN', countryName: 'India', region: 'Gujarat' },
    { key: 'Lucknow', name: 'Lucknow', type: 'city', countryCode: 'IN', countryName: 'India', region: 'Uttar Pradesh' },
    { key: 'Kanpur', name: 'Kanpur', type: 'city', countryCode: 'IN', countryName: 'India', region: 'Uttar Pradesh' },
    { key: 'Nagpur', name: 'Nagpur', type: 'city', countryCode: 'IN', countryName: 'India', region: 'Maharashtra' },
    { key: 'Indore', name: 'Indore', type: 'city', countryCode: 'IN', countryName: 'India', region: 'Madhya Pradesh' },
    { key: 'Thane', name: 'Thane', type: 'city', countryCode: 'IN', countryName: 'India', region: 'Maharashtra' },
    { key: 'Bhopal', name: 'Bhopal', type: 'city', countryCode: 'IN', countryName: 'India', region: 'Madhya Pradesh' },
    { key: 'Visakhapatnam', name: 'Visakhapatnam', type: 'city', countryCode: 'IN', countryName: 'India', region: 'Andhra Pradesh' },
    { key: 'Patna', name: 'Patna', type: 'city', countryCode: 'IN', countryName: 'India', region: 'Bihar' },
    { key: 'Vadodara', name: 'Vadodara', type: 'city', countryCode: 'IN', countryName: 'India', region: 'Gujarat' },
    { key: 'Ghaziabad', name: 'Ghaziabad', type: 'city', countryCode: 'IN', countryName: 'India', region: 'Uttar Pradesh' },
    { key: 'Ludhiana', name: 'Ludhiana', type: 'city', countryCode: 'IN', countryName: 'India', region: 'Punjab' },
    { key: 'Agra', name: 'Agra', type: 'city', countryCode: 'IN', countryName: 'India', region: 'Uttar Pradesh' },
    { key: 'Nashik', name: 'Nashik', type: 'city', countryCode: 'IN', countryName: 'India', region: 'Maharashtra' },
    { key: 'Faridabad', name: 'Faridabad', type: 'city', countryCode: 'IN', countryName: 'India', region: 'Haryana' },
    { key: 'Rajkot', name: 'Rajkot', type: 'city', countryCode: 'IN', countryName: 'India', region: 'Gujarat' },
    { key: 'Meerut', name: 'Meerut', type: 'city', countryCode: 'IN', countryName: 'India', region: 'Uttar Pradesh' },
    { key: 'Varanasi', name: 'Varanasi', type: 'city', countryCode: 'IN', countryName: 'India', region: 'Uttar Pradesh' },
    { key: 'Srinagar', name: 'Srinagar', type: 'city', countryCode: 'IN', countryName: 'India', region: 'Jammu & Kashmir' },
    { key: 'Amritsar', name: 'Amritsar', type: 'city', countryCode: 'IN', countryName: 'India', region: 'Punjab' },
    { key: 'Jabalpur', name: 'Jabalpur', type: 'city', countryCode: 'IN', countryName: 'India', region: 'Madhya Pradesh' },
    { key: 'Coimbatore', name: 'Coimbatore', type: 'city', countryCode: 'IN', countryName: 'India', region: 'Tamil Nadu' },
    { key: 'Kochi', name: 'Kochi', type: 'city', countryCode: 'IN', countryName: 'India', region: 'Kerala' },
    { key: 'Guwahati', name: 'Guwahati', type: 'city', countryCode: 'IN', countryName: 'India', region: 'Assam' },
    { key: 'Chandigarh', name: 'Chandigarh', type: 'city', countryCode: 'IN', countryName: 'India', region: 'Chandigarh' },
    { key: 'Noida', name: 'Noida', type: 'city', countryCode: 'IN', countryName: 'India', region: 'Uttar Pradesh' },
    { key: 'Gurgaon', name: 'Gurgaon', type: 'city', countryCode: 'IN', countryName: 'India', region: 'Haryana' },
    // India — States
    { key: 'MH', name: 'Maharashtra', type: 'region', countryCode: 'IN', countryName: 'India' },
    { key: 'DL', name: 'Delhi', type: 'region', countryCode: 'IN', countryName: 'India' },
    { key: 'KA', name: 'Karnataka', type: 'region', countryCode: 'IN', countryName: 'India' },
    { key: 'TN', name: 'Tamil Nadu', type: 'region', countryCode: 'IN', countryName: 'India' },
    { key: 'TS', name: 'Telangana', type: 'region', countryCode: 'IN', countryName: 'India' },
    { key: 'GJ', name: 'Gujarat', type: 'region', countryCode: 'IN', countryName: 'India' },
    { key: 'RJ', name: 'Rajasthan', type: 'region', countryCode: 'IN', countryName: 'India' },
    { key: 'UP', name: 'Uttar Pradesh', type: 'region', countryCode: 'IN', countryName: 'India' },
    { key: 'WB', name: 'West Bengal', type: 'region', countryCode: 'IN', countryName: 'India' },
    { key: 'MP', name: 'Madhya Pradesh', type: 'region', countryCode: 'IN', countryName: 'India' },
    { key: 'KL', name: 'Kerala', type: 'region', countryCode: 'IN', countryName: 'India' },
    { key: 'PB', name: 'Punjab', type: 'region', countryCode: 'IN', countryName: 'India' },
    { key: 'HR', name: 'Haryana', type: 'region', countryCode: 'IN', countryName: 'India' },
    { key: 'BR', name: 'Bihar', type: 'region', countryCode: 'IN', countryName: 'India' },
    { key: 'OR', name: 'Odisha', type: 'region', countryCode: 'IN', countryName: 'India' },
    // Major World Countries
    { key: 'US', name: 'United States', type: 'country', countryCode: 'US', countryName: 'United States' },
    { key: 'GB', name: 'United Kingdom', type: 'country', countryCode: 'GB', countryName: 'United Kingdom' },
    { key: 'AE', name: 'United Arab Emirates', type: 'country', countryCode: 'AE', countryName: 'UAE' },
    { key: 'SA', name: 'Saudi Arabia', type: 'country', countryCode: 'SA', countryName: 'Saudi Arabia' },
    { key: 'SG', name: 'Singapore', type: 'country', countryCode: 'SG', countryName: 'Singapore' },
    { key: 'AU', name: 'Australia', type: 'country', countryCode: 'AU', countryName: 'Australia' },
    { key: 'CA', name: 'Canada', type: 'country', countryCode: 'CA', countryName: 'Canada' },
    { key: 'QA', name: 'Qatar', type: 'country', countryCode: 'QA', countryName: 'Qatar' },
    { key: 'KW', name: 'Kuwait', type: 'country', countryCode: 'KW', countryName: 'Kuwait' },
    { key: 'NZ', name: 'New Zealand', type: 'country', countryCode: 'NZ', countryName: 'New Zealand' },
    { key: 'MY', name: 'Malaysia', type: 'country', countryCode: 'MY', countryName: 'Malaysia' },
    { key: 'DE', name: 'Germany', type: 'country', countryCode: 'DE', countryName: 'Germany' },
    { key: 'FR', name: 'France', type: 'country', countryCode: 'FR', countryName: 'France' },
    { key: 'NL', name: 'Netherlands', type: 'country', countryCode: 'NL', countryName: 'Netherlands' },
    { key: 'ZA', name: 'South Africa', type: 'country', countryCode: 'ZA', countryName: 'South Africa' },
    { key: 'NG', name: 'Nigeria', type: 'country', countryCode: 'NG', countryName: 'Nigeria' },
    { key: 'BD', name: 'Bangladesh', type: 'country', countryCode: 'BD', countryName: 'Bangladesh' },
    { key: 'PK', name: 'Pakistan', type: 'country', countryCode: 'PK', countryName: 'Pakistan' },
    { key: 'LK', name: 'Sri Lanka', type: 'country', countryCode: 'LK', countryName: 'Sri Lanka' },
    { key: 'NP', name: 'Nepal', type: 'country', countryCode: 'NP', countryName: 'Nepal' },
    // Major world cities
    { key: 'Dubai', name: 'Dubai', type: 'city', countryCode: 'AE', countryName: 'UAE', region: 'Dubai' },
    { key: 'London', name: 'London', type: 'city', countryCode: 'GB', countryName: 'United Kingdom', region: 'England' },
    { key: 'New York', name: 'New York', type: 'city', countryCode: 'US', countryName: 'United States', region: 'New York' },
    { key: 'Singapore City', name: 'Singapore', type: 'city', countryCode: 'SG', countryName: 'Singapore' },
    { key: 'Sydney', name: 'Sydney', type: 'city', countryCode: 'AU', countryName: 'Australia', region: 'New South Wales' },
    { key: 'Toronto', name: 'Toronto', type: 'city', countryCode: 'CA', countryName: 'Canada', region: 'Ontario' },
    { key: 'Riyadh', name: 'Riyadh', type: 'city', countryCode: 'SA', countryName: 'Saudi Arabia' },
    { key: 'Doha', name: 'Doha', type: 'city', countryCode: 'QA', countryName: 'Qatar' },
    { key: 'Dhaka', name: 'Dhaka', type: 'city', countryCode: 'BD', countryName: 'Bangladesh' },
    { key: 'Karachi', name: 'Karachi', type: 'city', countryCode: 'PK', countryName: 'Pakistan' },
    { key: 'Colombo', name: 'Colombo', type: 'city', countryCode: 'LK', countryName: 'Sri Lanka' },
    { key: 'Kathmandu', name: 'Kathmandu', type: 'city', countryCode: 'NP', countryName: 'Nepal' },
    { key: 'Kuala Lumpur', name: 'Kuala Lumpur', type: 'city', countryCode: 'MY', countryName: 'Malaysia' },
    { key: 'Abu Dhabi', name: 'Abu Dhabi', type: 'city', countryCode: 'AE', countryName: 'UAE' },
];

router.get('/location-search', async (req, res) => {
    const q = (req.query.q || '').trim().toLowerCase();
    if (!q || q.length < 1) return res.json({ locations: [], source: 'empty' });

    try {
        const user = await User.findByPk(req.user.id);
        const token = user?.metaAdsToken;

        if (token) {
            // ── Try Meta Targeting Search API first ──────────────────
            try {
                const metaRes = await axios.get('https://graph.facebook.com/v22.0/search', {
                    params: {
                        type: 'adgeolocation',
                        q: req.query.q.trim(),
                        location_types: JSON.stringify(['country', 'city', 'region', 'zip']),
                        access_token: token,
                        limit: 15
                    },
                    timeout: 5000
                });

                const metaData = metaRes.data?.data || [];
                const locations = metaData.map(loc => ({
                    key: loc.key,
                    name: loc.name,
                    type: loc.type,
                    countryCode: loc.country_code,
                    countryName: loc.country_name,
                    region: loc.region,
                    supportsRegion: loc.supports_region,
                    supportsCity: loc.supports_city,
                }));

                return res.json({ locations, source: 'meta' });
            } catch (metaErr) {
                console.warn('[LOCATION-SEARCH] Meta API failed, using fallback:', metaErr.response?.data?.error?.message || metaErr.message);
                // Fall through to local search
            }
        }

        // ── Fallback: filter local curated list ───────────────────────
        const filtered = FALLBACK_LOCATIONS.filter(loc => {
            const nameMatch = loc.name.toLowerCase().includes(q);
            const regionMatch = loc.region?.toLowerCase().includes(q);
            const countryMatch = loc.countryName?.toLowerCase().includes(q);
            return nameMatch || regionMatch || countryMatch;
        }).slice(0, 12);

        res.json({ locations: filtered, source: 'local' });
    } catch (err) {
        console.error('[LOCATION-SEARCH] Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/meta-ads/:id/status — Pause or Resume a live campaign
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/:id/status', async (req, res) => {
    try {
        const { action } = req.body; // 'pause' | 'resume'
        if (!['pause', 'resume'].includes(action)) {
            return res.status(400).json({ error: 'action must be "pause" or "resume"' });
        }

        const campaign = await MetaAdCampaign.findOne({ where: { id: req.params.id, userId: req.user.id } });
        if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

        const user = await User.findByPk(req.user.id);
        const metaStatus = action === 'pause' ? 'PAUSED' : 'ACTIVE';
        const localStatus = action === 'pause' ? 'Paused' : 'Active';

        // Sync with Meta Graph API if we have a real campaign ID
        if (campaign.metaCampaignId && user.metaAdsToken) {
            try {
                await axios.post(
                    `https://graph.facebook.com/v22.0/${campaign.metaCampaignId}`,
                    null,
                    { params: { status: metaStatus, access_token: user.metaAdsToken } }
                );
            } catch (fbErr) {
                console.error('[META-ADS] Pause/Resume Graph API error:', fbErr.response?.data?.error?.message || fbErr.message);
                return res.status(502).json({ error: 'Failed to update status on Meta: ' + (fbErr.response?.data?.error?.message || fbErr.message) });
            }
        }

        campaign.status = localStatus;
        await campaign.save();

        res.json({ success: true, status: localStatus, campaign: campaign.toJSON() });
    } catch (err) {
        console.error('[META-ADS] Status update error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/meta-ads/:id — Edit campaign name or daily budget
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/:id', async (req, res) => {
    try {
        const { campaignName, dailyBudget } = req.body;
        const campaign = await MetaAdCampaign.findOne({ where: { id: req.params.id, userId: req.user.id } });
        if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

        const user = await User.findByPk(req.user.id);
        const updates = {};

        // Update name on Meta
        if (campaignName && campaignName !== campaign.campaignName) {
            if (campaign.metaCampaignId && user.metaAdsToken) {
                try {
                    await axios.post(
                        `https://graph.facebook.com/v22.0/${campaign.metaCampaignId}`,
                        null,
                        { params: { name: campaignName, access_token: user.metaAdsToken } }
                    );
                } catch (fbErr) {
                    console.warn('[META-ADS] Name update on Meta failed (non-critical):', fbErr.response?.data?.error?.message);
                }
            }
            updates.campaignName = campaignName;
        }

        // Update budget on Meta AdSet
        if (dailyBudget && dailyBudget !== campaign.dailyBudget) {
            if (campaign.metaAdsetId && user.metaAdsToken) {
                try {
                    await axios.post(
                        `https://graph.facebook.com/v22.0/${campaign.metaAdsetId}`,
                        null,
                        { params: { daily_budget: Math.round(dailyBudget * 100), access_token: user.metaAdsToken } }
                    );
                } catch (fbErr) {
                    console.warn('[META-ADS] Budget update on Meta failed (non-critical):', fbErr.response?.data?.error?.message);
                }
            }
            updates.dailyBudget = dailyBudget;
        }

        if (Object.keys(updates).length > 0) {
            await campaign.update(updates);
        }

        res.json({ success: true, campaign: campaign.toJSON() });
    } catch (err) {
        console.error('[META-ADS] Edit campaign error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/meta-ads/:id — Delete / archive a campaign
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
    try {
        const campaign = await MetaAdCampaign.findOne({ where: { id: req.params.id, userId: req.user.id } });
        if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

        const user = await User.findByPk(req.user.id);

        // Archive on Meta first (Meta requires DELETED status, not actual deletion)
        if (campaign.metaCampaignId && user.metaAdsToken) {
            try {
                await axios.post(
                    `https://graph.facebook.com/v22.0/${campaign.metaCampaignId}`,
                    null,
                    { params: { status: 'DELETED', access_token: user.metaAdsToken } }
                );
            } catch (fbErr) {
                console.warn('[META-ADS] Archive on Meta failed (still deleting locally):', fbErr.response?.data?.error?.message);
            }
        }

        await campaign.destroy();
        res.json({ success: true, message: 'Campaign deleted' });
    } catch (err) {
        console.error('[META-ADS] Delete campaign error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/meta-ads/duplicate/:id — Clone an existing campaign as Draft
// ─────────────────────────────────────────────────────────────────────────────
router.post('/duplicate/:id', async (req, res) => {
    try {
        const original = await MetaAdCampaign.findOne({ where: { id: req.params.id, userId: req.user.id } });
        if (!original) return res.status(404).json({ error: 'Campaign not found' });

        const clone = await MetaAdCampaign.create({
            userId: req.user.id,
            campaignName: `${original.campaignName} (Copy)`,
            objective: original.objective,
            dailyBudget: original.dailyBudget,
            targeting: original.targeting,
            creatives: original.creatives,
            status: 'Draft',
            metaCampaignId: null,
            metaAdsetId: null,
            metaAdId: null,
            insights: {}
        });

        res.json({ success: true, campaign: clone.toJSON() });
    } catch (err) {
        console.error('[META-ADS] Duplicate campaign error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/meta-ads/:id — Get a single campaign (with optional live Meta sync)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
    try {
        const campaign = await MetaAdCampaign.findOne({ where: { id: req.params.id, userId: req.user.id } });
        if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

        const user = await User.findByPk(req.user.id);
        let insights = campaign.insights || {};

        // If requested to sync, and campaign is linked to Meta
        if (req.query.sync === 'true' && user.metaAdsToken && campaign.metaCampaignId) {
            try {
                const fbRes = await axios.get(
                    `https://graph.facebook.com/v22.0/${campaign.metaCampaignId}/insights`,
                    {
                        params: {
                            fields: 'impressions,clicks,spend,ctr,cpc,reach,frequency',
                            date_preset: 'maximum', // get lifetime stats for this campaign
                            access_token: user.metaAdsToken
                        }
                    }
                );

                const fbData = fbRes.data?.data?.[0] || {};
                insights = {
                    impressions: parseInt(fbData.impressions || 0),
                    clicks:      parseInt(fbData.clicks || 0),
                    spend:       parseFloat(fbData.spend || 0),
                    ctr:         fbData.ctr       ? parseFloat(fbData.ctr).toFixed(2)       : '0.00',
                    cpc:         fbData.cpc       ? parseFloat(fbData.cpc).toFixed(2)       : '0.00',
                    reach:       parseInt(fbData.reach || 0),
                    frequency:   fbData.frequency ? parseFloat(fbData.frequency).toFixed(2) : '0.00',
                    updatedAt:   new Date().toISOString()
                };

                campaign.insights = insights;
                await campaign.save();
            } catch (fbErr) {
                console.warn(`[META-ADS] Insights single sync failed for ${campaign.metaCampaignId}:`, fbErr.response?.data?.error?.message || fbErr.message);
            }
        }

        const enriched = {
            ...campaign.toJSON(),
            insights
        };

        res.json(enriched);
    } catch (err) {
        console.error('[META-ADS] Single campaign fetch error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
