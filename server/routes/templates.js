const express = require('express');
const router = express.Router();
const multer = require('multer');
const Template = require('../models/Template');
const Settings = require('../models/Settings');
const SystemNotification = require('../models/SystemNotification');
const auth = require('../middleware/auth');
const logActivity = require('../utils/logger');
const { getIo } = require('../socket');
const { getUserPlanLimits, checkLimit, getTemplateCount } = require('../utils/planLimits');

// Memory storage for temporary file buffer before piping to Meta
const { whatsappMediaFilter } = require('../utils/storageProvider');
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB max
    fileFilter: whatsappMediaFilter
});
// Apply auth middleware
router.use(auth);

// GET all templates for logged in user
router.get('/', async (req, res) => {
    try {
        const templates = await Template.findAll({
            where: { userId: req.user.id },
            order: [['createdAt', 'DESC']]
        });
        res.json(templates);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST upload media for template (Resumable Upload API)
const { compressImage, isCompressibleImage } = require('../utils/imageCompressor');
router.post('/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file provided' });

        const settings = await Settings.findOne({ where: { userId: req.user.id } });
        if (!settings || !settings.metaAccessToken) {
            return res.status(403).json({ error: 'Please configure your WhatsApp API settings first.' });
        }

        const appId = process.env.FB_CLIENT_ID;
        const fbToken = settings.metaAccessToken;

        if (!appId) {
            return res.status(500).json({ error: 'FB_CLIENT_ID is not configured in server environment.' });
        }

        // Compress image before uploading to Meta (reduces upload time & bandwidth)
        let fileBuffer = req.file.buffer;
        let fileSize = req.file.size;
        if (isCompressibleImage(req.file.mimetype)) {
            const result = await compressImage(fileBuffer, req.file.mimetype);
            fileBuffer = result.buffer;
            fileSize = fileBuffer.length;
            if (result.compressed) {
                console.log(`[TEMPLATE UPLOAD] Compressed ${req.file.originalname}: ${(result.originalSize / 1024).toFixed(0)}KB → ${(result.compressedSize / 1024).toFixed(0)}KB`);
            }
        }

        // Step 1: Create Resumable Upload Session
        const sessionUrl = `https://graph.facebook.com/v17.0/${appId}/uploads?file_length=${fileSize}&file_type=${encodeURIComponent(req.file.mimetype)}`;
        const sessionRes = await fetch(sessionUrl, {
            method: 'POST',
            headers: {
                'Authorization': `OAuth ${fbToken}`
            }
        });

        const sessionData = await sessionRes.json();
        if (!sessionRes.ok) throw new Error(sessionData.error?.message || 'Failed to create upload session with Meta.');

        const sessionId = sessionData.id;

        // Step 2: Upload File Data
        const uploadUrl = `https://graph.facebook.com/v17.0/${sessionId}`;
        const uploadRes = await fetch(uploadUrl, {
            method: 'POST',
            headers: {
                'Authorization': `OAuth ${fbToken}`,
                'file_offset': '0'
            },
            body: fileBuffer
        });

        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadData.error?.message || 'Failed to upload media data to Meta.');

        res.json({ handle: uploadData.h });
    } catch (err) {
        console.error("Upload Media Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// POST upload media for SENDING messages (Standard Media API) - also saves locally or S3 for inbox display
const FormData = require('form-data');
const axios = require('axios');
const fs = require('fs');
const storageProvider = require('../utils/storageProvider');

router.post('/upload-message-media', storageProvider('campaign-media', { fileFilter: storageProvider.whatsappMediaFilter }).single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file provided' });

        const settings = await Settings.findOne({ where: { userId: req.user.id } });
        if (!settings || !settings.metaAccessToken || !settings.metaPhoneNumberId) {
            return res.status(403).json({ error: 'Please configure your WhatsApp API settings first.' });
        }

        // Build URL for inbox display
        const localUrl = req.file.publicUrl;

        // Also upload to Meta for actual sending using axios and form-data (Node compatible)
        const form = new FormData();
        
        if (req.file.location) {
            // It's S3, stream from the public URL
            const fileStreamRes = await axios.get(req.file.publicUrl, { responseType: 'stream' });
            form.append('file', fileStreamRes.data, { filename: req.file.originalname });
        } else {
            // It's local
            form.append('file', fs.createReadStream(req.file.path));
        }

        form.append('messaging_product', 'whatsapp');

        const uploadRes = await axios.post(
            `https://graph.facebook.com/v17.0/${settings.metaPhoneNumberId}/media`,
            form,
            {
                headers: {
                    ...form.getHeaders(),
                    'Authorization': `Bearer ${settings.metaAccessToken}`
                }
            }
        );

        res.json({ mediaId: uploadRes.data.id, localUrl });
    } catch (err) {
        console.error("Upload Message Media Error:", err.response?.data || err.message);
        res.status(500).json({ error: err.response?.data?.error?.message || err.message });
    }
});

// CREATE template
router.post('/', async (req, res) => {
    try {
        const { name, content, category, language, headerType, headerContent, headerHandle, footer, buttons, cards, archetype } = req.body;

        // Check template limit (dynamic — reads from Plan in DB)
        const limits = await getUserPlanLimits(req.user.id);
        const currentTemplateCount = await getTemplateCount(req.user.id);
        const tmplCheck = checkLimit(currentTemplateCount, limits.templateLimit);
        if (!tmplCheck.allowed) {
            return res.status(429).json({
                error: `Template limit reached (${tmplCheck.used}/${tmplCheck.limit}). Upgrade your plan to create more templates.`,
                code: 'TEMPLATE_LIMIT_REACHED',
                used: tmplCheck.used,
                limit: tmplCheck.limit
            });
        }

        // Check if user has configured WhatsApp settings
        const settings = await Settings.findOne({ where: { userId: req.user.id } });
        if (!settings || !settings.metaPhoneNumberId || !settings.metaAccessToken || !settings.metaBusinessAccountId) {
            return res.status(403).json({ error: 'Please configure your WhatsApp API settings before creating templates.' });
        }

        let components = [];

        // Build Carousel Payload
        if (archetype === 'carousel' && cards && cards.length > 0) {
            // Master Body for Carousel
            if (content) {
                const bodyComp = { type: "BODY", text: content };
                if (req.body.bodyVariables && req.body.bodyVariables.length > 0) {
                    bodyComp.example = { body_text: [req.body.bodyVariables] };
                }
                components.push(bodyComp);
            }

            // Carousel component containing cards
            const carouselCards = cards.map(card => {
                const cardComponents = [];

                // Card Header (Meta requires IMAGE or VIDEO for carousel cards)
                if (card.headerType && card.headerType !== 'NONE') {
                    // NOTE: Meta requires a media 'handle' for creating templates with media.
                    // For now, if no handle is provided via direct upload, we pass a sample URL.
                    const headerComp = {
                        type: "HEADER",
                        format: card.headerType
                    };
                    if (card.headerHandle) {
                        headerComp.example = { header_handle: [card.headerHandle] };
                    }
                    cardComponents.push(headerComp);
                }

                // Card Body
                if (card.content) {
                    cardComponents.push({
                        type: "BODY",
                        text: card.content
                    });
                }

                // Card Buttons
                if (card.buttons && card.buttons.length > 0) {
                    const cardBtns = card.buttons.map(btn => {
                        if (btn.type === 'URL') return { type: 'URL', text: btn.text, url: btn.url };
                        if (btn.type === 'PHONE_NUMBER') return { type: 'PHONE_NUMBER', text: btn.text, phone_number: btn.phoneNumber };
                        if (btn.type === 'COPY_CODE') return { type: 'COPY_CODE', text: 'Copy offer code', example: [btn.couponCode || ''] };
                        return { type: 'QUICK_REPLY', text: btn.text };
                    });
                    cardComponents.push({
                        type: "BUTTONS",
                        buttons: cardBtns
                    });
                }

                return { components: cardComponents };
            });

            components.push({
                type: "CAROUSEL",
                cards: carouselCards
            });

        } else {
            // Standard Payload Construction
            if (headerType && headerType !== 'NONE') {
                const headerComp = { type: "HEADER", format: headerType };
                if (headerType === 'TEXT' && headerContent) {
                    headerComp.text = headerContent;
                    if (req.body.headerVariables && req.body.headerVariables.length > 0) {
                        headerComp.example = { header_text: req.body.headerVariables };
                    }
                } else if (['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerType) && headerHandle) {
                    headerComp.example = { header_handle: [headerHandle] };
                }
                components.push(headerComp);
            }

            if (content) {
                const bodyComp = { type: "BODY", text: content };
                if (req.body.bodyVariables && req.body.bodyVariables.length > 0) {
                    bodyComp.example = { body_text: [req.body.bodyVariables] };
                }
                components.push(bodyComp);
            }

            if (footer) {
                components.push({ type: "FOOTER", text: footer });
            }

            if (buttons && buttons.length > 0) {
                const standardBtns = buttons.map(btn => {
                    if (btn.type === 'URL') return { type: 'URL', text: btn.text, url: btn.url };
                    if (btn.type === 'PHONE_NUMBER') return { type: 'PHONE_NUMBER', text: btn.text, phone_number: btn.phoneNumber };
                    if (btn.type === 'COPY_CODE') return { type: 'COPY_CODE', text: 'Copy offer code', example: [btn.couponCode || ''] };
                    return { type: 'QUICK_REPLY', text: btn.text };
                });
                components.push({ type: "BUTTONS", buttons: standardBtns });
            }
        }

        // Prepare Meta Payload
        const metaPayload = {
            name: name,
            category: category || "MARKETING",
            allow_category_change: true,
            language: language || "en_US",
            components: components
        };

        // Send to Meta Graph API
        const response = await fetch(`https://graph.facebook.com/v17.0/${settings.metaBusinessAccountId}/message_templates`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${settings.metaAccessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(metaPayload)
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("Meta Creation Error:", JSON.stringify(data, null, 2));
            return res.status(400).json({ error: (data.error?.error_user_msg || data.error?.message || 'Failed to create template on WhatsApp.') + JSON.stringify(data.error?.error_data || '') });
        }

        // Save to DB on success
        const newTemplate = await Template.create({
            name,
            content,
            category: category || "MARKETING",
            language: language || "en_US",
            userId: req.user.id,
            createdById: req.user.realId || req.user.id,
            status: data.status || 'PENDING',
            metaTemplateId: data.id,
            archetype: archetype || 'standard',
            cards: archetype === 'carousel' ? cards : null,
            buttons: archetype !== 'carousel' ? buttons : null,
            headerType: archetype !== 'carousel' ? headerType : null,
            headerContent: archetype !== 'carousel' ? headerContent : null,
            headerHandle: archetype !== 'carousel' ? headerHandle : null,
            footer: archetype !== 'carousel' ? footer : null
        });

        // Auto-Notification
        try {
            await SystemNotification.create({
                recipient: req.user.email,
                type: 'Success',
                title: 'Template Submitted',
                message: `Your template "${name}" has been successfully submitted to Meta and is pending review.`,
                target: `User: ${req.user.email}`,
                status: 'Sent'
            });

            // Emit socket event to update user notifications in real-time
            getIo().to(req.user.id).emit('notification_update');
        } catch (notifErr) {
            console.error("Failed to create template notification:", notifErr.message);
        }

        await logActivity(req, 'Template Created', `Created template "${name}" (${language})`);

        res.json(newTemplate);
    } catch (err) {
        console.error("Template Creation Error:", err);
        res.status(400).json({ error: err.message });
    }
});

// DELETE template
router.delete('/:id', async (req, res) => {
    try {
        const template = await Template.findOne({
            where: { id: req.params.id, userId: req.user.id }
        });

        if (!template) return res.status(404).json({ error: 'Template not found' });

        const settings = await Settings.findOne({ where: { userId: req.user.id } });
        if (settings && settings.metaBusinessAccountId && settings.metaAccessToken) {
            try {
                // Meta API for deleting template requires the name parameter
                const response = await fetch(`https://graph.facebook.com/v17.0/${settings.metaBusinessAccountId}/message_templates?name=${template.name}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${settings.metaAccessToken}`
                    }
                });

                const data = await response.json();
                if (!response.ok) {
                    // Log error but we will still proceed to delete it locally 
                    // (in case it's already deleted in Meta or out of sync)
                    console.error("Meta Deletion Warning:", data);
                } else {
                    console.log(`[META] Successfully deleted template ${template.name} from Meta.`);
                }
            } catch (metaErr) {
                console.error("Failed to make delete request to Meta:", metaErr);
            }
        }

        await template.destroy();

        await logActivity(req, 'Template Deleted', `Deleted template: ${template.name}`);

        res.json({ message: 'Template deleted from App and Meta' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// SYNC templates from Meta
router.post('/sync', async (req, res) => {
    try {
        const settings = await Settings.findOne({ where: { userId: req.user.id } });
        if (!settings || !settings.metaBusinessAccountId || !settings.metaAccessToken) {
            return res.status(403).json({ error: 'WhatsApp settings not configured.' });
        }

        const { metaBusinessAccountId, metaAccessToken } = settings;

        // Fetch templates from Meta
        const response = await fetch(`https://graph.facebook.com/v17.0/${metaBusinessAccountId}/message_templates?limit=100`, {
            headers: { 'Authorization': `Bearer ${metaAccessToken}` }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error?.message || 'Failed to fetch from Meta');
        }

        const metaTemplates = data.data || [];
        const syncResults = { added: 0, updated: 0 };

        for (const mt of metaTemplates) {
            const existing = await Template.findOne({
                where: { userId: req.user.id, name: mt.name, language: mt.language }
            });

            const bodyComponent = mt.components.find(c => c.type === 'BODY');
            const contentText = bodyComponent ? bodyComponent.text : '';

            const headerComponent = mt.components.find(c => c.type === 'HEADER');
            let headerType = 'NONE';
            let headerContent = null;
            if (headerComponent) {
                headerType = headerComponent.format;
                if (headerType === 'TEXT') headerContent = headerComponent.text;
            }

            const footerComponent = mt.components.find(c => c.type === 'FOOTER');
            const footerText = footerComponent ? footerComponent.text : null;

            const buttonsComponent = mt.components.find(c => c.type === 'BUTTONS');
            let buttons = null;
            if (buttonsComponent && buttonsComponent.buttons) {
                buttons = buttonsComponent.buttons.map(b => {
                    const mapped = { type: b.type, text: b.text };
                    if (b.type === 'URL') mapped.url = b.url;
                    if (b.type === 'PHONE_NUMBER') mapped.phoneNumber = b.phone_number;
                    if (b.type === 'COPY_CODE') mapped.couponCode = b.example?.[0] || 'CODE';
                    return mapped;
                });
            }

            const carouselComponent = mt.components.find(c => c.type === 'CAROUSEL');
            let cards = null;
            if (carouselComponent && carouselComponent.cards) {
                cards = carouselComponent.cards.map(card => {
                    const cHeader = card.components.find(c => c.type === 'HEADER');
                    const cBody = card.components.find(c => c.type === 'BODY');
                    const cButtons = card.components.find(c => c.type === 'BUTTONS');
                    
                    let cardBtns = [];
                    if (cButtons && cButtons.buttons) {
                        cardBtns = cButtons.buttons.map(b => {
                            const mapped = { type: b.type, text: b.text };
                            if (b.type === 'URL') mapped.url = b.url;
                            if (b.type === 'PHONE_NUMBER') mapped.phoneNumber = b.phone_number;
                            if (b.type === 'COPY_CODE') mapped.couponCode = b.example?.[0] || 'CODE';
                            return mapped;
                        });
                    }

                    return {
                        headerType: cHeader ? cHeader.format : 'IMAGE',
                        content: cBody ? cBody.text : '',
                        buttons: cardBtns
                    };
                });
            }

            let archetype = 'simple_text';
            if (carouselComponent) archetype = 'carousel';
            else if (buttons && buttons.length > 0) {
                if (buttons.some(b => ['URL', 'PHONE_NUMBER', 'COPY_CODE'].includes(b.type))) {
                    archetype = 'call_to_action';
                } else {
                    archetype = 'quick_replies';
                }
            } else if (['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerType)) {
                archetype = 'media_message';
            } else if (mt.category === 'AUTHENTICATION') {
                archetype = 'authentication';
            }

            if (existing) {
                let updated = false;
                if (existing.status !== mt.status) {
                    existing.status = mt.status;
                    updated = true;
                }
                if (existing.metaTemplateId !== mt.id) {
                    existing.metaTemplateId = mt.id;
                    updated = true;
                }
                
                // Keep local cache in sync with Meta truth
                const existingBtnsStr = JSON.stringify(existing.buttons || []);
                const incomingBtnsStr = JSON.stringify(buttons || []);
                const existingCardsStr = JSON.stringify(existing.cards || []);
                const incomingCardsStr = JSON.stringify(cards || []);

                if (existingBtnsStr !== incomingBtnsStr ||
                    existingCardsStr !== incomingCardsStr ||
                    existing.content !== contentText ||
                    existing.archetype !== archetype ||
                    existing.headerType !== headerType ||
                    existing.headerContent !== headerContent ||
                    existing.footer !== footerText) 
                {
                    existing.content = contentText;
                    existing.archetype = archetype;
                    existing.buttons = buttons;
                    existing.cards = cards;
                    existing.headerType = headerType;
                    existing.headerContent = headerContent;
                    existing.footer = footerText;
                    updated = true;
                }

                if (updated) {
                    await existing.save();
                    syncResults.updated++;
                }
            } else {
                await Template.create({
                    userId: req.user.id,
                    name: mt.name,
                    language: mt.language,
                    category: mt.category,
                    content: contentText || 'Synced from Meta',
                    status: mt.status,
                    metaTemplateId: mt.id,
                    archetype: archetype,
                    buttons: buttons,
                    cards: cards,
                    headerType: headerType,
                    headerContent: headerContent,
                    footer: footerText
                });
                syncResults.added++;
            }
        }

        res.json({
            success: true,
            message: `Synced successfully. Added: ${syncResults.added}, Updated: ${syncResults.updated}.`,
            metaCount: metaTemplates.length,
            ...syncResults
        });

        if (syncResults.added > 0 || syncResults.updated > 0) {
            await logActivity(req, 'Templates Synced', `Synced templates: ${syncResults.added} added, ${syncResults.updated} updated`);
        }

    } catch (err) {
        console.error("Sync Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// ENHANCE Body text with AI
router.post('/enhance-ai', async (req, res) => {
    const { text } = req.body;
    try {
        if (!text) return res.status(400).json({ error: 'Text to enhance is required' });

        const User = require('../models/User');
        const SystemConfig = require('../models/SystemConfig');
        const user = await User.findByPk(req.user.id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const sysConfig = await SystemConfig.getConfig();
        const multiplier = sysConfig?.settings?.aiTokenMultipliers?.ai_template_enhancer ?? 1;
        const BASE_COST = 5;
        const finalCost = Math.ceil(BASE_COST * multiplier);

        if (user.aiTokenBalance < finalCost) {
            return res.status(402).json({ error: `Insufficient AI tokens. Required: ${finalCost}` });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server.' });

        const aiModel = sysConfig?.settings?.aiModel || 'gemini-2.0-flash';
        const axios = require('axios');

        const systemInstruction = `You are an expert copywriter specializing in high-converting WhatsApp marketing messages.
Your goal is to enhance, proofread, and optimize the user's text for WhatsApp. 
Fix grammar, make it punchy, engaging, and professional but concise.
If there are any variables like {{1}}, {{2}} etc., keep them EXACTLY as they are. DO NOT change, remove, or re-order variables unless absolutely necessary for flow, but you must retain the exact variable placeholders.
Output ONLY the final enhanced message text. Do not include introductory notes, quotes, or markdown wrappers.`;

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${aiModel}:generateContent?key=${apiKey}`;
        const payload = {
            systemInstruction: { parts: [{ text: systemInstruction }] },
            contents: [{ role: 'user', parts: [{ text: text }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
        };

        const aiRes = await axios.post(url, payload, { headers: { 'Content-Type': 'application/json' } });
        let replyText = aiRes.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        replyText = replyText.replace(/```(whatsapp|text|markdown)?/gi, '').replace(/```/gi, '').trim();

        await user.decrement('aiTokenBalance', { by: finalCost });
        const newBal = (user.aiTokenBalance - finalCost);

        try {
            const AiTokenLog = require('../models/AiTokenLog');
            await AiTokenLog.create({
                userId: req.user.id,
                feature: 'ai_template_enhancer',
                tokensUsed: finalCost,
                balanceAfter: Math.max(0, newBal)
            });
        } catch (logErr) {
            console.warn('[TEMPLATES AI] Failed to write AiTokenLog:', logErr.message);
        }

        res.json({
            enhancedText: replyText,
            tokensDeducted: finalCost,
            newBalance: newBal
        });
    } catch (err) {
        console.error('Error enhancing text with AI:', err.response?.data || err.message);
        const actualError = err.response?.data?.error?.message || err.message || '';
        const shortError = actualError.split(' ').slice(0, 5).join(' ');
        res.status(500).json({ 
            error: `Failed to communicate with AI: (${shortError}...)`,
            fullError: err.response?.data || actualError
        });
    }
});

// DRAFT template with AI
router.post('/draft-ai', async (req, res) => {
    const { prompt } = req.body;
    try {
        if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

        const User = require('../models/User');
        const SystemConfig = require('../models/SystemConfig');
        const user = await User.findByPk(req.user.id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const sysConfig = await SystemConfig.getConfig();
        const multiplier = sysConfig?.settings?.aiTokenMultipliers?.ai_template_enhancer ?? 1;
        const BASE_COST = 10;
        const finalCost = Math.ceil(BASE_COST * multiplier);

        if (user.aiTokenBalance < finalCost) {
            return res.status(402).json({ error: `Insufficient AI tokens. Required: ${finalCost}` });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server.' });

        const aiModel = sysConfig?.settings?.aiModel || 'gemini-2.0-flash';
        const axios = require('axios');

        const systemInstruction = `You are an expert WhatsApp Business template architect. The user will describe a WhatsApp message template they want to build.
Your task is to generate a perfectly structured, Meta-compliant JSON configuration based EXACTLY on their requirements.

OUTPUT STRICTLY VALID JSON. NO MARKDOWN WRAPPERS (\`\`\`json). NO COMMENTS. JUST RAW JSON.

=== BUTTON TYPES — READ THIS CAREFULLY ===
There are 4 button types. Choose the CORRECT one based on strict intent matching:

1. "QUICK_REPLY" — Use ONLY when the user wants a one-tap reply button (like "Yes", "No", "Interested", "Not Now"). These send a message back to the business. DO NOT use for coupons, links, or phone calls.

2. "URL" — Use when the user wants to redirect to a website. Requires a "url" field. Examples: "Visit Website", "Shop Now", "Learn More".

3. "PHONE_NUMBER" — Use when the user wants to initiate a phone call. Requires a "phoneNumber" field.

4. "COPY_CODE" — Use when the user mentions: "coupon code", "promo code", "discount code", "copy code", "coupon copy button", "copy coupon", or any intent to let the user copy a code. Requires a "couponCode" field with the actual code string.
   Example: { "type": "COPY_CODE", "text": "Copy Coupon", "couponCode": "LAUNCH50" }

=== INTENT → BUTTON TYPE MAPPING (STRICT) ===
- "copy code", "coupon code", "promo code", "discount code" → COPY_CODE
- "visit website", "website link", "learn more", "open link", "shop now" → URL
- "call us", "phone number", "call now" → PHONE_NUMBER
- "reply yes/no", "quick reply", "interested/not interested" → QUICK_REPLY

=== FULL JSON SCHEMA ===
{
  "name": "string (lowercase, max 50 chars, NO spaces, use underscores e.g. launch_promo_01)",
  "category": "MARKETING | UTILITY | AUTHENTICATION",
  "archetype": "simple_text | media_message | call_to_action | quick_replies | authentication | carousel",
  "language": "en_US (default unless specified)",
  "headerType": "NONE | TEXT | IMAGE | VIDEO | DOCUMENT",
  "headerContent": "string (only if headerType is TEXT, max 60 chars)",
  "content": "string (body text, max 1024 chars, use {{1}} {{2}} for variables)",
  "footer": "string (optional, max 60 chars)",
  "bodyVariables": { "1": "sample_value", "2": "other_sample" },
  "buttons": [
    { "type": "URL", "text": "Visit Website", "url": "https://example.com" },
    { "type": "PHONE_NUMBER", "text": "Call Us", "phoneNumber": "+1234567890" },
    { "type": "QUICK_REPLY", "text": "Yes, interested" },
    { "type": "COPY_CODE", "text": "Copy Coupon", "couponCode": "SAVE20" }
  ],
  "cards": [
    {
      "headerType": "IMAGE",
      "headerContent": "",
      "content": "Card body text here",
      "buttons": []
    }
  ]
}

=== ARCHITECTURE RULES ===
- "media_message": set headerType to IMAGE/VIDEO/DOCUMENT, fill buttons array at root level.
- "carousel": put ALL buttons inside each card's "buttons" array. Root "buttons" must be empty [].
- "authentication": headerType NONE, no buttons, body must say something like "Your code is {{1}}.".
- "call_to_action": at least one URL or PHONE_NUMBER button.
- "quick_replies": at least one QUICK_REPLY button.
- If user asks for BOTH media header AND mixed buttons → use "media_message" archetype.
- Max limits: 10 QUICK_REPLY buttons, 2 URL buttons, 1 PHONE_NUMBER button, 1 COPY_CODE button per template.
- NEVER add URLs inside body text or footer — always use a URL button instead.
- NEVER use QUICK_REPLY for coupon/promo codes — always use COPY_CODE.
`;

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${aiModel}:generateContent?key=${apiKey}`;
        const payload = {
            systemInstruction: { parts: [{ text: systemInstruction }] },
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.6, maxOutputTokens: 2048 }
        };

        const aiRes = await axios.post(url, payload, { headers: { 'Content-Type': 'application/json' } });
        let replyText = aiRes.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        replyText = replyText.replace(/```(whatsapp|text|markdown|json)?/gi, '').replace(/```/gi, '').trim();

        let generatedDraft;
        try {
            generatedDraft = JSON.parse(replyText);
        } catch (e) {
            console.error("AI JSON Parse Error:", replyText);
            return res.status(500).json({ error: 'AI generated invalid structure. Please try again.' });
        }

        await user.decrement('aiTokenBalance', { by: finalCost });
        const newBal = (user.aiTokenBalance - finalCost);

        try {
            const AiTokenLog = require('../models/AiTokenLog');
            await AiTokenLog.create({
                userId: req.user.id,
                feature: 'ai_template_draft',
                tokensUsed: finalCost,
                balanceAfter: Math.max(0, newBal)
            });
        } catch (logErr) {
            console.warn('[TEMPLATES AI] Failed to write AiTokenLog:', logErr.message);
        }

        res.json({
            draft: generatedDraft,
            tokensDeducted: finalCost,
            newBalance: newBal
        });
    } catch (err) {
        console.error('Error drafting template with AI:', err.response?.data || err.message);
        const actualError = err.response?.data?.error?.message || err.message || '';
        const shortError = actualError.split(' ').slice(0, 5).join(' ');
        res.status(500).json({ 
            error: `Failed to communicate with AI: (${shortError}...)`,
            fullError: err.response?.data || actualError
        });
    }
});

module.exports = router;
