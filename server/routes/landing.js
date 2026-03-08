const express = require('express');
const router = express.Router();
const LandingPage = require('../models/LandingPage');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

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
            seo: req.body.seo || settings.seo
        });

        res.json(settings);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
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

module.exports = router;
