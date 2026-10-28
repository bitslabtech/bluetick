const express = require('express');
const router = express.Router();
const LandingPage = require('../models/LandingPage');

// @route   GET /robots.txt
// @desc    Dynamic robots.txt directives for search engines & Google Search Console
router.get('/', async (req, res) => {
    try {
        let canonicalUrl = '';
        let robotsSetting = 'index, follow';

        try {
            const landing = await LandingPage.findOne({ attributes: ['seo'] });
            if (landing?.seo?.canonicalUrl && !landing.seo.canonicalUrl.includes('localhost')) {
                canonicalUrl = landing.seo.canonicalUrl.replace(/\/+$/, '');
            }
            if (landing?.seo?.robots) {
                robotsSetting = landing.seo.robots;
            }
        } catch (_) {}

        if (!canonicalUrl) {
            const domain = process.env.PLATFORM_DOMAIN ? process.env.PLATFORM_DOMAIN.replace(/^https?:\/\//, '').replace(/\/+$/, '') : '';
            if (domain && !domain.includes('localhost')) {
                canonicalUrl = `https://${domain}`;
            } else if (process.env.FRONTEND_URL && !process.env.FRONTEND_URL.includes('localhost')) {
                canonicalUrl = process.env.FRONTEND_URL.replace(/\/+$/, '');
            } else {
                canonicalUrl = `${req.headers['x-forwarded-proto'] || req.protocol || 'https'}://${req.headers['x-forwarded-host'] || req.get('host') || 'bluetick.cloud'}`;
            }
        }

        const isNoIndex = robotsSetting.toLowerCase().includes('noindex');

        res.type('text/plain; charset=utf-8');
        res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24h

        let content = `# robots.txt generated automatically by OneDash\n\n`;
        if (isNoIndex) {
            content += `User-agent: *\nDisallow: /\n\n`;
        } else {
            content += `User-agent: *\nAllow: /\n\n# Disallow internal API and admin control panels from indexing\nDisallow: /api/\nDisallow: /admin/\nDisallow: /checkout\n\n`;
        }
        content += `# Sitemap index\nSitemap: ${canonicalUrl}/sitemap.xml\n`;

        res.send(content);
    } catch (err) {
        console.error('[Robots] Error serving robots.txt:', err);
        res.type('text/plain; charset=utf-8');
        res.send(`User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /admin/\n\nSitemap: https://${process.env.PLATFORM_DOMAIN || 'bluetick.cloud'}/sitemap.xml\n`);
    }
});

module.exports = router;
