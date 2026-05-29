const express = require('express');
const router = express.Router();
const LandingPage = require('../models/LandingPage');

// @route   GET /sitemap.xml
// @desc    Generate dynamic XML sitemap
router.get('/', async (req, res) => {
    try {
        const baseUrl = process.env.BASE_URL || 'http://localhost:5173';
        const currentDate = new Date().toISOString();

        // Basic routes
        const routes = [
            { url: '/', changefreq: 'daily', priority: 1.0 },
            { url: '/login', changefreq: 'weekly', priority: 0.8 },
            { url: '/register', changefreq: 'weekly', priority: 0.9 },
        ];

        let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

        routes.forEach(route => {
            xml += `
    <url>
        <loc>${baseUrl}${route.url}</loc>
        <lastmod>${currentDate}</lastmod>
        <changefreq>${route.changefreq}</changefreq>
        <priority>${route.priority}</priority>
    </url>`;
        });

        xml += `
</urlset>`;

        res.header('Content-Type', 'application/xml');
        res.send(xml);

    } catch (err) {
        console.error("Sitemap Error:", err);
        res.status(500).send('Error generating sitemap');
    }
});

// @route   POST /sitemap.xml/generate
// @desc    Generate sitemap and save it as a physical file
router.post('/generate', async (req, res) => {
    try {
        const baseUrl = process.env.BASE_URL || 'http://localhost:5173';
        const currentDate = new Date().toISOString();

        // Basic routes
        const routes = [
            { url: '/', changefreq: 'daily', priority: 1.0 },
            { url: '/login', changefreq: 'weekly', priority: 0.8 },
            { url: '/register', changefreq: 'weekly', priority: 0.9 },
        ];

        let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

        routes.forEach(route => {
            xml += `
    <url>
        <loc>${baseUrl}${route.url}</loc>
        <lastmod>${currentDate}</lastmod>
        <changefreq>${route.changefreq}</changefreq>
        <priority>${route.priority}</priority>
    </url>`;
        });

        xml += `
</urlset>`;

        const fs = require('fs');
        const path = require('path');
        
        // Save to client/public
        const sitemapPath = path.join(__dirname, '../../client/public/sitemap.xml');
        fs.writeFileSync(sitemapPath, xml);

        res.json({ success: true, message: 'Sitemap generated and saved successfully.' });

    } catch (err) {
        console.error("Sitemap Generate Error:", err);
        res.status(500).json({ success: false, message: 'Error generating sitemap' });
    }
});

module.exports = router;
