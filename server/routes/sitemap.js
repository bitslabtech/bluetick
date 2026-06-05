const express = require('express');
const router = express.Router();
const WaStore = require('../models/WaStore');
const WaProduct = require('../models/WaProduct');

// ─── Helper: build a URL entry ────────────────────────────────────────────────
function urlEntry(loc, { lastmod, changefreq, priority }) {
    return `
    <url>
        <loc>${loc}</loc>
        <lastmod>${lastmod}</lastmod>
        <changefreq>${changefreq}</changefreq>
        <priority>${priority}</priority>
    </url>`;
}

// ─── Helper: generate the full sitemap XML ────────────────────────────────────
async function buildSitemapXml(baseUrl) {
    const now = new Date().toISOString();

    // Static app routes
    const staticRoutes = [
        { url: '/',          changefreq: 'daily',  priority: 1.0 },
        { url: '/login',     changefreq: 'weekly', priority: 0.8 },
        { url: '/register',  changefreq: 'weekly', priority: 0.9 },
        { url: '/blog',      changefreq: 'weekly', priority: 0.7 },
        { url: '/about',     changefreq: 'monthly', priority: 0.5 },
        { url: '/contact',   changefreq: 'monthly', priority: 0.5 },
        { url: '/partner',   changefreq: 'monthly', priority: 0.5 },
    ];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">`;

    // ── Static routes ─────────────────────────────────────────────────────────
    staticRoutes.forEach(r => {
        xml += urlEntry(`${baseUrl}${r.url}`, { lastmod: now, changefreq: r.changefreq, priority: r.priority });
    });

    // ── Dynamic store routes ──────────────────────────────────────────────────
    try {
        const stores = await WaStore.findAll({
            where: { isActive: true },
            attributes: ['id', 'slug', 'categories', 'categoryImages', 'logo', 'updatedAt']
        });

        for (const store of stores) {
            const storeUpdated = store.updatedAt ? new Date(store.updatedAt).toISOString() : now;
            const storeUrl = `${baseUrl}/store/${store.slug}`;

            // Store home page
            xml += urlEntry(storeUrl, {
                lastmod: storeUpdated,
                changefreq: 'weekly',
                priority: 0.9
            });

            // Category pages
            let categories = [];
            try {
                categories = Array.isArray(store.categories)
                    ? store.categories
                    : (typeof store.categories === 'string' ? JSON.parse(store.categories) : []);
            } catch (_) {}

            for (const cat of categories) {
                if (!cat) continue;
                xml += urlEntry(`${storeUrl}?cat=${encodeURIComponent(cat)}`, {
                    lastmod: storeUpdated,
                    changefreq: 'weekly',
                    priority: 0.7
                });
            }

            // Product pages
            const products = await WaProduct.findAll({
                where: { storeId: store.id, inStock: true },
                attributes: ['id', 'name', 'imageUrls', 'updatedAt']
            });

            for (const product of products) {
                const productUrl = `${storeUrl}/product/${product.id}`;
                const productUpdated = product.updatedAt ? new Date(product.updatedAt).toISOString() : now;

                // Build image tags if available
                let imageXml = '';
                const images = product.imageUrls || [];
                const firstImage = Array.isArray(images) ? images[0] : null;
                if (firstImage) {
                    const resolvedImg = firstImage.startsWith('http') ? firstImage : `${baseUrl}${firstImage}`;
                    imageXml = `
        <image:image>
            <image:loc>${resolvedImg}</image:loc>
            <image:title>${product.name.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</image:title>
        </image:image>`;
                }

                xml += `
    <url>
        <loc>${productUrl}</loc>
        <lastmod>${productUpdated}</lastmod>
        <changefreq>monthly</changefreq>
        <priority>0.8</priority>${imageXml}
    </url>`;
            }
        }
    } catch (err) {
        console.error('[Sitemap] Error fetching store data:', err.message);
        // Non-fatal: sitemap still returns static routes
    }

    xml += `\n</urlset>`;
    return xml;
}

// @route   GET /sitemap.xml
// @desc    Generate and serve dynamic XML sitemap
router.get('/', async (req, res) => {
    try {
        const baseUrl = process.env.BASE_URL || 'http://localhost:5173';
        const xml = await buildSitemapXml(baseUrl);
        res.header('Content-Type', 'application/xml');
        res.header('Cache-Control', 'public, max-age=3600'); // cache 1 hour
        res.send(xml);
    } catch (err) {
        console.error('Sitemap Error:', err);
        res.status(500).send('Error generating sitemap');
    }
});

// @route   POST /sitemap.xml/generate
// @desc    Generate sitemap and save it as a physical file (for static hosting)
router.post('/generate', async (req, res) => {
    try {
        const baseUrl = process.env.BASE_URL || 'http://localhost:5173';
        const xml = await buildSitemapXml(baseUrl);

        const fs = require('fs');
        const path = require('path');

        const sitemapPath = path.join(__dirname, '../../client/public/sitemap.xml');
        fs.writeFileSync(sitemapPath, xml);

        // Count entries for reporting
        const storeCount = (xml.match(/\/store\//g) || []).length;
        res.json({
            success: true,
            message: `Sitemap generated with ~${storeCount} store URLs saved successfully.`
        });
    } catch (err) {
        console.error('Sitemap Generate Error:', err);
        res.status(500).json({ success: false, message: 'Error generating sitemap' });
    }
});

module.exports = router;
