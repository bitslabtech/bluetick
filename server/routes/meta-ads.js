const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const MetaAdCampaign = require('../models/MetaAdCampaign');
const User = require('../models/User');
const SystemConfig = require('../models/SystemConfig');
const AiTokenLog = require('../models/AiTokenLog');
const axios = require('axios');

router.use(auth);

// GET all campaigns
router.get('/', async (req, res) => {
    try {
        const campaigns = await MetaAdCampaign.findAll({
            where: { userId: req.user.id },
            order: [['createdAt', 'DESC']]
        });
        res.json(campaigns);
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
  "age_min": integer (e.g. 18),
  "age_max": integer (e.g. 65),
  "interests": ["string", "string"], // 3-5 specific FB interests
  "locations": ["string", "string"], // 1-3 suggested locations
  "ai_strategy_note": "string (Short paragraph explaining the reasoning)"
}`;

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${aiModel}:generateContent?key=${apiKey}`;
        const payload = {
            systemInstruction: { parts: [{ text: systemInstruction }] },
            contents: [{ role: 'user', parts: [{ text: businessDescription }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 1024 }
        };

        const aiRes = await axios.post(url, payload);
        let replyText = aiRes.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        replyText = replyText.replace(/```(json)?/gi, '').replace(/```/gi, '').trim();

        let generatedSpec;
        try {
            generatedSpec = JSON.parse(replyText);
        } catch (e) {
            return res.status(500).json({ error: 'AI generated invalid structure.' });
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
    const { businessDescription, tone } = req.body;
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

        const systemInstruction = `You are a direct-response copywriter for Meta Ads.
The user wants ad copy to drive messages to their WhatsApp.
Tone: ${tone || 'Persuasive and professional'}.

Output STRICTLY VALID JSON. NO MARKDOWN. NO COMMENTS.
Schema:
{
  "variations": [
    {
      "primary_text": "string (Main ad text, use emojis)",
      "headline": "string (Short, punchy, e.g., 'Chat with us now!')"
    }
  ] // Provide 3 variations
}`;

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${aiModel}:generateContent?key=${process.env.GEMINI_API_KEY}`;
        const payload = {
            systemInstruction: { parts: [{ text: systemInstruction }] },
            contents: [{ role: 'user', parts: [{ text: businessDescription }] }],
            generationConfig: { temperature: 0.8, maxOutputTokens: 1024 }
        };

        const aiRes = await axios.post(url, payload);
        let replyText = aiRes.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        replyText = replyText.replace(/```(json)?/gi, '').replace(/```/gi, '').trim();

        let generatedCopy;
        try {
            generatedCopy = JSON.parse(replyText);
        } catch (e) {
            return res.status(500).json({ error: 'AI generated invalid structure.' });
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
        const { campaignName, objective, dailyBudget, targeting, creatives, imageUrl } = req.body;
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
            creatives: { ...creatives, imageUrl }, 
            status: fbStatus
        });

        res.json({ success: true, campaign });
    } catch (err) {
        console.error("Publish error:", err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
