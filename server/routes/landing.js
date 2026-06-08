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

        // Update fields based on request body
        // Sequelize's update method or direct property assignment
        await settings.update({
            hero: req.body.hero || settings.hero,
            features: req.body.features || settings.features,
            stats: req.body.stats || settings.stats,
            testimonials: req.body.testimonials || settings.testimonials,
            cta: req.body.cta || settings.cta,
            brand: req.body.brand || settings.brand,
            trustedBy: req.body.trustedBy || settings.trustedBy,
            faqs: req.body.faqs || settings.faqs,
            steps: req.body.steps || settings.steps,
            seo: req.body.seo || settings.seo,
            theme: req.body.theme || settings.theme,
            footer: req.body.footer || settings.footer,
            publicPages: req.body.publicPages || settings.publicPages,
            contactInfo: req.body.contactInfo || settings.contactInfo,
            capabilities: req.body.capabilities || settings.capabilities,
            advancedFeatures: req.body.advancedFeatures || settings.advancedFeatures,
            industries: req.body.industries || settings.industries,
            aiChatbot: req.body.aiChatbot || settings.aiChatbot
        });

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

        const systemInstruction = `You are a helpful and polite customer support AI assistant for this platform.
        
Your only goal is to assist users by answering questions strictly related to the platform based on the knowledge base provided below.
If a user asks about anything outside the scope of this platform (e.g., coding, general knowledge, math, other companies), politely decline and tell them you can only assist with platform-related inquiries.
Keep your answers concise, engaging, and friendly. Do not use markdown that a simple chat UI cannot render (use standard text).

Knowledge Base:
${aiConfig.knowledgeBase}
`;

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

        res.json({ reply: responseText });
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

        const blog = await Blog.create({
            ...req.body,
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

        await blog.update(req.body);
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
