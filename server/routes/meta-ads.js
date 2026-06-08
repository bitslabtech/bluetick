const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const MetaAdCampaign = require('../models/MetaAdCampaign');
const User = require('../models/User');
const SystemConfig = require('../models/SystemConfig');
const AiTokenLog = require('../models/AiTokenLog');
const axios = require('axios');
const { Op } = require('sequelize');

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
    const { businessDescription } = req.body;
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

        const systemInstruction = `You are an expert Meta Ads Strategist. 
The user is providing a description of their business/product.
Your job is to recommend the best targeting for a Click-to-WhatsApp (CTWA) ad campaign to maximize ROI.

Output STRICTLY VALID JSON. NO MARKDOWN. NO COMMENTS.
Schema:
{
  "age_min": 18,
  "age_max": 65,
  "interests": ["string", "string"],
  "locations": ["string", "string"],
  "ai_strategy_note": "string (Short paragraph explaining the reasoning)"
}`;

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${aiModel}:generateContent?key=${apiKey}`;
        const payload = {
            systemInstruction: { parts: [{ text: systemInstruction }] },
            contents: [{ role: 'user', parts: [{ text: businessDescription }] }],
            generationConfig: { 
                temperature: 0.7, 
                maxOutputTokens: 1024,
                responseMimeType: "application/json"
            }
        };

        const aiRes = await axios.post(url, payload);
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
                maxOutputTokens: 1024,
                responseMimeType: "application/json"
            }
        };

        const aiRes = await axios.post(url, payload);
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

        const aiRes = await axios.post(url, payload);
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
        const { campaignName, objective, dailyBudget, targeting, creatives, imageUrl, automation } = req.body;
        const user = await User.findByPk(req.user.id);
        
        let fbStatus = 'Draft';

        if (user.metaAdsToken && user.metaAdAccountId) {
            try {
                const fbAdAccountId = user.metaAdAccountId;
                const token = user.metaAdsToken;

                // 1. Create Campaign
                const campRes = await axios.post(`https://graph.facebook.com/v22.0/${fbAdAccountId}/campaigns`, null, {
                    params: {
                        name: campaignName,
                        objective: 'OUTCOME_ENGAGEMENT',
                        status: 'ACTIVE', // Publish as ACTIVE 
                        special_ad_categories: [],
                        access_token: token
                    }
                });
                const campaignId = campRes.data.id;

                // 2. Create AdSet
                const adSetRes = await axios.post(`https://graph.facebook.com/v22.0/${fbAdAccountId}/adsets`, null, {
                    params: {
                        name: `${campaignName} - AdSet`,
                        campaign_id: campaignId,
                        daily_budget: dailyBudget * 100, // Meta takes cents
                        billing_event: 'IMPRESSIONS',
                        optimization_goal: 'REPLIES',
                        promoted_object: JSON.stringify({
                            whatsapp_number: user.phone || 'UNKNOWN_PHONE' // Meta requires a linked WA number, we omit for mockup if it fails
                        }),
                        targeting: JSON.stringify({
                            age_max: targeting.age_max || 65,
                            age_min: targeting.age_min || 18,
                            geo_locations: { countries: ["US"] } // Simplified
                        }),
                        status: 'ACTIVE', // Live from the platform
                        access_token: token
                    }
                }).catch(e => {
                    console.log('FB Graph Warning (AdSet missing WA config): ', e.response?.data?.error?.message);
                    return { data: { id: null } }; // Keep going locally if graph fails due to strict FB setup rules
                });

                fbStatus = adSetRes.data.id ? 'Active' : 'Draft';
            } catch (graphAPIError) {
                console.error("Graph API Publish Error:", graphAPIError.response?.data || graphAPIError.message);
                fbStatus = 'Draft (API Error)';
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
            metaCampaignId: fbStatus !== 'Draft' ? (campRes?.data?.id || null) : null,
            metaAdsetId: fbStatus !== 'Draft' ? (adSetRes?.data?.id || null) : null
        });

        res.json({ success: true, campaign });
    } catch (err) {
        console.error("Publish error:", err);
        res.status(500).json({ error: err.message });
    }
});

// GET /insights — Fetch live insights from Facebook Graph API and cache them
router.get('/insights', async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);
        const { range = 'last_30d' } = req.query;

        // Map our range to Facebook date presets
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

            // If user has a token AND this campaign has a real Facebook ID, fetch live data
            if (hasToken && campaign.metaCampaignId) {
                try {
                    const fbRes = await axios.get(
                        `https://graph.facebook.com/v22.0/${campaign.metaCampaignId}/insights`,
                        {
                            params: {
                                fields: 'impressions,clicks,spend,ctr,cpc,reach',
                                date_preset: datePreset,
                                access_token: user.metaAdsToken
                            }
                        }
                    );

                    const fbData = fbRes.data?.data?.[0] || {};
                    insights = {
                        impressions: parseInt(fbData.impressions || 0),
                        clicks: parseInt(fbData.clicks || 0),
                        spend: parseFloat(fbData.spend || 0),
                        ctr: fbData.ctr ? parseFloat(fbData.ctr).toFixed(2) : '0.00',
                        cpc: fbData.cpc ? parseFloat(fbData.cpc).toFixed(2) : '0.00',
                        reach: parseInt(fbData.reach || 0),
                        updatedAt: new Date().toISOString()
                    };

                    // Cache insights in DB
                    campaign.insights = insights;
                    await campaign.save();
                } catch (fbErr) {
                    console.error(`[META-ADS] Failed to fetch insights for campaign ${campaign.metaCampaignId}:`, fbErr.response?.data?.error?.message || fbErr.message);
                    // Use cached insights if live fetch fails
                }
            }

            totalImpressions += parseInt(insights.impressions || 0);
            totalClicks += parseInt(insights.clicks || 0);
            totalSpend += parseFloat(insights.spend || 0);

            results.push({
                id: plain.id,
                campaignName: plain.campaignName,
                objective: plain.objective,
                dailyBudget: plain.dailyBudget,
                status: plain.status,
                metaCampaignId: plain.metaCampaignId,
                createdAt: plain.createdAt,
                // Insights
                impressions: insights.impressions || null,
                clicks: insights.clicks || null,
                spend: insights.spend || null,
                ctr: insights.ctr || null,
                cpc: insights.cpc || null,
                reach: insights.reach || null,
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

module.exports = router;
