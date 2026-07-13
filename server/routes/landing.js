const express = require('express');
const router = express.Router();
const LandingPage = require('../models/LandingPage');
const Blog = require('../models/Blog');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const { Op } = require('sequelize');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const cacheManager = require('../utils/cacheManager');
const _landingCache = cacheManager.createSimpleCache('landing_page', 60_000);
 // Multer Setup for Blog Images replaced by storageProvider 

// @route   GET /api/landing
// @desc    Get landing page configuration (Public)
router.get('/', async (req, res) => {
    try {
        const cached = _landingCache.get();
        if (cached) return res.json(cached);

        const settings = await LandingPage.getSettings();
        _landingCache.set(settings);
        res.json(settings);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT /api/landing
// @desc    Update landing page configuration (Admin only)
router.put('/', [auth, admin], async (req, res) => {
    try {
        let settings = await LandingPage.findOne();
        if (!settings) {
            settings = await LandingPage.create();
        }

        // Force Sequelize to detect JSON changes
        settings.hero = req.body.hero || settings.hero;
        settings.features = req.body.features || settings.features;
        settings.stats = req.body.stats || settings.stats;
        settings.testimonials = req.body.testimonials || settings.testimonials;
        settings.cta = req.body.cta || settings.cta;
        settings.brand = req.body.brand || settings.brand;
        settings.trustedBy = req.body.trustedBy || settings.trustedBy;
        settings.faqs = req.body.faqs || settings.faqs;
        settings.steps = req.body.steps || settings.steps;
        settings.seo = req.body.seo || settings.seo;
        settings.theme = req.body.theme || settings.theme;
        settings.footer = req.body.footer || settings.footer;
        if (req.body.publicPages !== undefined) settings.publicPages = req.body.publicPages;
        if (req.body.contactInfo !== undefined) settings.contactInfo = req.body.contactInfo;
        if (req.body.capabilities !== undefined) settings.capabilities = req.body.capabilities;
        if (req.body.advancedFeatures !== undefined) settings.advancedFeatures = req.body.advancedFeatures;
        if (req.body.industries !== undefined) settings.industries = req.body.industries;
        if (req.body.aiChatbot !== undefined) settings.aiChatbot = req.body.aiChatbot;
        
        settings.changed('publicPages', true);
        settings.changed('footer', true);
        settings.changed('contactInfo', true);

        await settings.save();

        // Invalidate landing page cache
        cacheManager.invalidate('landing_page');

        res.json(settings);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST /api/landing/chat
// @desc    Interact with public AI chatbot
router.post('/chat', async (req, res) => {
    try {
        const { message, history } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        let settings = _landingCache.get();
        if (!settings) {
            settings = await LandingPage.getSettings();
        }

        if (!settings || !settings.aiChatbot || !settings.aiChatbot.enabled) {
            return res.status(403).json({ error: 'Chatbot is currently disabled.' });
        }

        const aiConfig = settings.aiChatbot;

        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).json({ error: 'AI API Key not configured.' });
        }

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

        // Use the same model as the rest of the app (from SystemConfig, fallback to gemini-2.0-flash)
        let aiModelName = 'gemini-2.0-flash';
        try {
            const SystemConfig = require('../models/SystemConfig');
            const sysConfig = await SystemConfig.getConfig();
            aiModelName = sysConfig?.settings?.aiModel || 'gemini-2.0-flash';
        } catch (e) { /* use default if SystemConfig not available */ }

        let systemInstruction = `You are a helpful and polite customer support AI assistant for this platform.
        
Your only goal is to assist users by answering questions strictly related to the platform based on the knowledge base provided below.
If a user asks about anything outside the scope of this platform (e.g., coding, general knowledge, math, other companies), politely decline and tell them you can only assist with platform-related inquiries.
Keep your answers concise, engaging, and friendly. Do not use markdown that a simple chat UI cannot render (use standard text).

Knowledge Base:
${aiConfig.knowledgeBase}
`;

        if (aiConfig.leadCaptureEnabled) {
            systemInstruction += `\n\nLEAD GENERATION INSTRUCTIONS:
You are also acting as a Sales Development Representative. Your goal is to understand the user's requirement and capture their phone number with country code.
1. First, answer their initial questions naturally based on the Knowledge Base.
2. Then, ask them the following qualification questions to understand their needs: "${aiConfig.qualificationQuestions || 'What is your main requirement?'}"
3. Once they provide their requirement, evaluate it briefly and explain how our platform can be helpful to them.
4. Immediately after that, ask for their WhatsApp phone number (including country code) and their name so an expert can reach out to them.
5. IMPORTANT: When the user provides their phone number, you MUST output a secret JSON block exactly in this format at the very end of your response:
[LEAD_DATA: {"phone": "THE_PHONE_NUMBER", "name": "THE_NAME"}]
(If name is not provided, leave it empty). Extract the phone number starting with the country code (e.g. +1234567890) and strip all other spaces/symbols from it.`;
        }

        // Gemini requires history to start with a 'user' turn.
        // Strip any leading 'model' messages (e.g. the welcome message).
        // If no user message exists in history, send empty history.
        const rawHistory = history || [];
        const firstUserIdx = rawHistory.findIndex(m => m.role === 'user');
        const validHistory = firstUserIdx === -1 ? [] : rawHistory.slice(firstUserIdx);

        const formattedHistory = validHistory.map(msg => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content || '' }]
        }));

        // Fallback chain: if configured model hits quota/overload, try cheaper ones automatically
        const modelFallbackChain = [
            aiModelName,
            'gemini-2.0-flash',
            'gemini-2.0-flash-lite',
        ].filter((m, i, arr) => arr.indexOf(m) === i); // deduplicate

        let responseText = null;
        let lastError = null;

        for (const modelName of modelFallbackChain) {
            try {
                const model = genAI.getGenerativeModel({ model: modelName, systemInstruction });
                const chat = model.startChat({ history: formattedHistory });
                const result = await chat.sendMessage(message);
                responseText = result.response.text();
                if (modelName !== aiModelName) {
                    console.warn(`[Chat] Fell back from ${aiModelName} → ${modelName}`);
                }
                break; // success — stop trying
            } catch (err) {
                const msg = err?.message || '';
                const isRetryable = msg.includes('503') || msg.includes('429') || msg.includes('quota') || msg.includes('Unavailable');
                lastError = err;
                if (!isRetryable) throw err; // non-recoverable error — don't retry
                console.warn(`[Chat] Model ${modelName} failed (retryable): ${msg.slice(0, 120)}`);
            }
        }

        if (responseText === null) throw lastError;

        let replyText = responseText;

        // Extract LEAD_DATA block
        const leadDataMatch = replyText.match(/\[LEAD_DATA:\s*(\{.*?\})\s*\]/);
        if (leadDataMatch && aiConfig.leadCaptureEnabled) {
            try {
                const leadData = JSON.parse(leadDataMatch[1]);
                const phone = leadData.phone.replace(/[^+\d]/g, ''); // Ensure pure digits with optional +
                const name = leadData.name || 'AI Chatbot Lead';
                
                // Assign to the selected team members (or just the first one if the model only supports single assign)
                if (phone && aiConfig.crmOwners && aiConfig.crmOwners.length > 0) {
                    const primaryOwnerId = aiConfig.crmOwners[0]; 
                    
                    const Contact = require('../models/Contact');
                    const Conversation = require('../models/Conversation');
                    const Settings = require('../models/Settings');
                    const Template = require('../models/Template');
                    const ChatMessage = require('../models/ChatMessage');

                    // Helper to parse arrays or comma-separated strings
                    const parseTags = (input) => {
                        if (!input) return [];
                        if (Array.isArray(input)) return input.map(t => typeof t === 'object' ? (t.value || t.name) : t.toString());
                        if (typeof input === 'string') return input.split(',').map(t => t.trim()).filter(Boolean);
                        return [];
                    };
                    
                    const tagsToAdd = [
                        ...parseTags(aiConfig.crmTags),
                        ...parseTags(aiConfig.crmGroups)
                    ];

                    // 1. Create or Update Contact
                    const [contact, created] = await Contact.findOrCreate({
                        where: { userId: primaryOwnerId, phone: phone },
                        defaults: {
                            name: name,
                            tags: tagsToAdd,
                            createdById: primaryOwnerId
                        }
                    });

                    if (!created && tagsToAdd.length > 0) {
                        contact.tags = [...new Set([...(contact.tags || []), ...tagsToAdd])];
                        if (name !== 'AI Chatbot Lead') contact.name = name; // Update name if provided
                        await contact.save();
                    }

                    // 2. Create or Update Conversation
                    const [conversation, convCreated] = await Conversation.findOrCreate({
                        where: { userId: primaryOwnerId, phoneNumber: phone },
                        defaults: {
                            contactName: contact.name,
                            unreadCount: 0,
                            assignedTo: primaryOwnerId
                        }
                    });
                    
                    if (!convCreated) {
                        conversation.assignedTo = primaryOwnerId;
                        await conversation.save();
                    }

                    // 3. Auto Trigger Template
                    if (aiConfig.autoTriggerTemplate && aiConfig.templateName) {
                        const ownerSettings = await Settings.findOne({ where: { userId: primaryOwnerId } });
                        const template = await Template.findOne({ where: { userId: primaryOwnerId, name: aiConfig.templateName } });

                        if (ownerSettings && ownerSettings.metaPhoneNumberId && ownerSettings.metaAccessToken && template) {
                            const payload = {
                                messaging_product: "whatsapp",
                                to: phone,
                                type: "template",
                                template: {
                                    name: template.name,
                                    language: { code: template.language }
                                }
                            };
                            
                            // Fire and forget fetch to Meta API
                            fetch(`https://graph.facebook.com/v21.0/${ownerSettings.metaPhoneNumberId}/messages`, {
                                method: 'POST',
                                headers: {
                                    'Authorization': `Bearer ${ownerSettings.metaAccessToken}`,
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify(payload)
                            }).then(res => res.json()).then(async (data) => {
                                if (data.messages && data.messages[0]) {
                                    await ChatMessage.create({
                                        userId: primaryOwnerId,
                                        conversationId: conversation.id,
                                        messageId: data.messages[0].id,
                                        from: ownerSettings.metaPhoneNumberId,
                                        to: phone,
                                        type: 'template',
                                        text: `[System]: Auto-triggered template "${template.name}" via AI Chatbot Lead Capture.`,
                                        direction: 'outbound',
                                        status: 'sent',
                                        timestamp: new Date()
                                    });
                                }
                            }).catch(e => console.error("Auto Template Trigger Error:", e));
                        }
                    }
                }
            } catch (e) {
                console.error("Lead extraction/processing error:", e);
            }
            
            // Remove the secret JSON block from the user-facing output
            replyText = replyText.replace(/\[LEAD_DATA:\s*(\{.*?\})\s*\]/, '').trim();
        }

        res.json({ reply: replyText });
    } catch (error) {
        const errMsg = error?.message || '';
        console.error('Chat API Error:', errMsg || error?.status || error);

        // Give users a more helpful message when quota is exhausted
        if (errMsg.includes('429') || errMsg.includes('quota')) {
            return res.status(429).json({ error: 'AI service is temporarily at capacity. Please try again in a minute.' });
        }
        res.status(500).json({ error: 'Failed to process chat message.' });
    }
});

// @route   POST /api/landing/upload-capability
// @desc    Upload image for a capability card (Admin only)
const storageProvider = require('../utils/storageProvider');
router.post('/upload-capability', [auth, admin], storageProvider('capabilities', { fileFilter: storageProvider.generalImageFilter, convertToWebp: true }).single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image provided' });
        }
        res.json({ success: true, imageUrl: req.file.publicUrl });
    } catch (err) {
        console.error('Capability Image Upload Error:', err);
        res.status(500).json({ error: 'Server Error' });
    }
});

// @route   POST /api/landing/upload-feature
// @desc    Upload image for an advanced feature card (Admin only)
router.post('/upload-feature', [auth, admin], storageProvider('features', { fileFilter: storageProvider.generalImageFilter, convertToWebp: true }).single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image provided' });
        }
        res.json({ success: true, imageUrl: req.file.publicUrl });
    } catch (err) {
        console.error('Feature Image Upload Error:', err);
        res.status(500).json({ error: 'Server Error' });
    }
});

// @route   POST /api/landing/upload-industry
// @desc    Upload image for an industry card (Admin only)
router.post('/upload-industry', [auth, admin], storageProvider('industries', { fileFilter: storageProvider.generalImageFilter, convertToWebp: true }).single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image provided' });
        }
        res.json({ success: true, imageUrl: req.file.publicUrl });
    } catch (err) {
        console.error('Industry Image Upload Error:', err);
        res.status(500).json({ error: 'Server Error' });
    }
});

// @route   POST /api/landing/upload-hero
// @desc    Upload image for hero section (Admin only)
router.post('/upload-hero', [auth, admin], storageProvider('hero', { fileFilter: storageProvider.generalImageFilter, convertToWebp: true }).single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image provided' });
        }
        res.json({ success: true, imageUrl: req.file.publicUrl });
    } catch (err) {
        console.error('Hero Image Upload Error:', err);
        res.status(500).json({ error: 'Server Error' });
    }
});

// @route   POST /api/landing/reset
// @desc    Reset landing page to default (Admin only)
router.post('/reset', [auth, admin], async (req, res) => {
    try {
        await LandingPage.destroy({ where: {}, truncate: true });
        const settings = await LandingPage.getSettings(); // Re-creates with defaults

        // Invalidate landing page cache
        cacheManager.invalidate('landing_page');

        res.json(settings);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// ==========================================
// BLOG API ROUTES
// ==========================================

// @route   GET /api/landing/blogs
// @desc    Get all blogs (Admin sees all, Public sees published)
router.get('/blogs', async (req, res) => {
    try {
        // Simple check if user is admin (requires sending token from frontend even for public, or we just use a query param for admin)
        // For public pages, we just want published blogs. For admin dashboard, we want all.
        const isAdminRequest = req.query.admin === 'true'; // A loose check, but we verify via token if we wanted. For now, we trust the admin boolean for fetching lists, or better:
        
        let where = { isPublished: true };
        
        // If it's the admin dashboard requesting, return all
        if (isAdminRequest) {
            where = {};
        }

        const blogs = await Blog.findAll({
            where,
            order: [['createdAt', 'DESC']],
            attributes: { exclude: ['content'] } // Don't load massive HTML in list view
        });
        res.json(blogs);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/landing/blogs/:identifier
// @desc    Get single blog by slug or ID
router.get('/blogs/:identifier', async (req, res) => {
    try {
        const identifier = req.params.identifier;
        const blog = await Blog.findOne({
            where: {
                [Op.or]: [
                    { slug: identifier },
                    { id: identifier.length === 36 ? identifier : null } // UUID check
                ]
            }
        });
        
        if (!blog) return res.status(404).json({ msg: 'Blog not found' });
        
        // Optionally increment views if requested by public
        if (req.query.view === 'true') {
            blog.views += 1;
            await blog.save();
        }

        res.json(blog);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// @route   POST /api/landing/blogs
// @desc    Create a new blog (Admin only)
router.post('/blogs', [auth, admin], async (req, res) => {
    try {
        // Make sure slug is unique
        let slug = req.body.slug;
        const existing = await Blog.findOne({ where: { slug } });
        if (existing) {
            slug = slug + '-' + Math.round(Math.random() * 1000); // Append random if not unique
        }

        const data = { ...req.body };
        delete data.id;

        const blog = await Blog.create({
            ...data,
            slug,
            authorId: req.user.id
        });
        
        res.json(blog);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// @route   PUT /api/landing/blogs/:id
// @desc    Update a blog (Admin only)
router.put('/blogs/:id', [auth, admin], async (req, res) => {
    try {
        const blog = await Blog.findByPk(req.params.id);
        if (!blog) return res.status(404).json({ msg: 'Blog not found' });

        if (req.body.slug && req.body.slug !== blog.slug) {
            const existing = await Blog.findOne({ where: { slug: req.body.slug } });
            if (existing && existing.id !== blog.id) {
                 req.body.slug = req.body.slug + '-' + Math.round(Math.random() * 1000);
            }
        }

        const updates = { ...req.body };
        delete updates.id;
        delete updates.createdAt;
        delete updates.updatedAt;
        await blog.update(updates);
        res.json(blog);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE /api/landing/blogs/:id
// @desc    Delete a blog (Admin only)
router.delete('/blogs/:id', [auth, admin], async (req, res) => {
    try {
        const blog = await Blog.findByPk(req.params.id);
        if (!blog) return res.status(404).json({ msg: 'Blog not found' });

        await blog.destroy();
        res.json({ msg: 'Blog removed' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

router.post('/blogs/upload', [auth, admin, storageProvider('blogs', { fileFilter: storageProvider.generalImageFilter, convertToWebp: true }).single('image')], async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file provided' });
        
        res.json({ url: req.file.publicUrl });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
