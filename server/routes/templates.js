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
const upload = multer({ storage: multer.memoryStorage() });

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

        // Step 1: Create Resumable Upload Session
        const sessionUrl = `https://graph.facebook.com/v17.0/${appId}/uploads?file_length=${req.file.size}&file_type=${encodeURIComponent(req.file.mimetype)}`;
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
            body: req.file.buffer
        });

        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadData.error?.message || 'Failed to upload media data to Meta.');

        res.json({ handle: uploadData.h });
    } catch (err) {
        console.error("Upload Media Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// POST upload media for SENDING messages (Standard Media API) - also saves locally for inbox display
const path = require('path');
const fs = require('fs');
const uploadDisk = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            const dir = path.join(__dirname, '../public/uploads/campaign-media');
            fs.mkdirSync(dir, { recursive: true });
            cb(null, dir);
        },
        filename: (req, file, cb) => {
            const ext = path.extname(file.originalname);
            cb(null, `${Date.now()}-${Math.random().toString(36).substr(2, 8)}${ext}`);
        }
    })
});

router.post('/upload-message-media', uploadDisk.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file provided' });

        const settings = await Settings.findOne({ where: { userId: req.user.id } });
        if (!settings || !settings.metaAccessToken || !settings.metaPhoneNumberId) {
            return res.status(403).json({ error: 'Please configure your WhatsApp API settings first.' });
        }

        // Build local URL for inbox display
        const localUrl = `http://localhost:5000/uploads/campaign-media/${req.file.filename}`;

        // Also upload to Meta for actual sending using axios and form-data (Node compatible)
        const FormData = require('form-data');
        const axios = require('axios');

        const form = new FormData();
        form.append('file', fs.createReadStream(req.file.path));
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
                components.push({ type: "BODY", text: content });
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
                } else if (['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerType) && headerHandle) {
                    headerComp.example = { header_handle: [headerHandle] };
                }
                components.push(headerComp);
            }

            if (content) {
                components.push({ type: "BODY", text: content });
            }

            if (footer) {
                components.push({ type: "FOOTER", text: footer });
            }

            if (buttons && buttons.length > 0) {
                const standardBtns = buttons.map(btn => {
                    if (btn.type === 'URL') return { type: 'URL', text: btn.text, url: btn.url };
                    if (btn.type === 'PHONE_NUMBER') return { type: 'PHONE_NUMBER', text: btn.text, phone_number: btn.phoneNumber };
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
            console.error("Meta Creation Error:", data);
            return res.status(400).json({ error: data.error?.message || 'Failed to create template on WhatsApp.' });
        }

        // Save to DB on success
        // Save to DB on success
        const newTemplate = await Template.create({
            name,
            content,
            category: category || "MARKETING",
            language: language || "en_US",
            userId: req.user.id,
            status: data.status || 'PENDING',
            metaTemplateId: data.id,
            archetype: archetype || 'standard',
            cards: archetype === 'carousel' ? cards : null
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

            if (existing) {
                if (existing.status !== mt.status) {
                    existing.status = mt.status;
                    existing.metaTemplateId = mt.id;
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
                    metaTemplateId: mt.id
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

module.exports = router;
