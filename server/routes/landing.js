const express = require('express');
const router = express.Router();
const LandingPage = require('../models/LandingPage');
const Blog = require('../models/Blog');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const { Op } = require('sequelize');
 // Multer Setup for Blog Images replaced by storageProvider 

// @route   GET /api/landing
// @desc    Get landing page configuration (Public)
router.get('/', async (req, res) => {
    try {
        const settings = await LandingPage.getSettings();
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
            industries: req.body.industries || settings.industries
        });

        res.json(settings);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST /api/landing/upload-capability
// @desc    Upload image for a capability card (Admin only)
const storageProvider = require('../utils/storageProvider');
router.post('/upload-capability', [auth, admin], storageProvider('capabilities').single('image'), async (req, res) => {
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
router.post('/upload-feature', [auth, admin], storageProvider('features').single('image'), async (req, res) => {
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
router.post('/upload-industry', [auth, admin], storageProvider('industries').single('image'), async (req, res) => {
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

// @route   POST /api/landing/reset
// @desc    Reset landing page to default (Admin only)
router.post('/reset', [auth, admin], async (req, res) => {
    try {
        await LandingPage.destroy({ where: {}, truncate: true });
        const settings = await LandingPage.getSettings(); // Re-creates with defaults
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

router.post('/blogs/upload', [auth, admin, storageProvider('blogs').single('image')], async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file provided' });
        
        res.json({ url: req.file.publicUrl });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
