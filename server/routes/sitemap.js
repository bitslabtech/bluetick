const express = require('express');
const router = express.Router();
const WaStore = require('../models/WaStore');
const WaProduct = require('../models/WaProduct');
const Blog = require('../models/Blog');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const fs = require('fs');
const path = require('path');

// ─── Helper: escape XML special characters ────────────────────────────────────
function escapeXml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

// ─── Helper: build a URL entry ────────────────────────────────────────────────
function urlEntry(loc, { lastmod, changefreq, priority }) {
    return `
    <url>
        <loc>${escapeXml(loc)}</loc>
        <lastmod>${lastmod}</lastmod>
        <changefreq>${changefreq}</changefreq>
        <priority>${priority}</priority>
    </url>`;
}

// ─── Helper: resolve base URL ─────────────────────────────────────────────────
function resolveBaseUrl(req) {
    if (process.env.FRONTEND_URL) {
        return process.env.FRONTEND_URL.replace(/\/+$/, '');
    }
    if (process.env.BASE_URL) {
        return process.env.BASE_URL.replace(/\/+$/, '');
    }
    if (process.env.PLATFORM_DOMAIN) {
        return `https://${process.env.PLATFORM_DOMAIN.replace(/^https?:\/\//, '').replace(/\/+$/, '')}`;
    }
    if (req) {
        const proto = req.headers['x-forwarded-proto'] || req.protocol || 'http';
        const host = req.headers['x-forwarded-host'] || req.get('host');
        if (host) return `${proto}://${host}`;
    }
    return 'http://localhost:5173';
}

// ─── Helper: generate the full sitemap XML ────────────────────────────────────
async function buildSitemapXml(baseUrl) {
    const now = new Date().toISOString();

    // Static app routes
    const staticRoutes = [
        { url: '/',               changefreq: 'daily',   priority: 1.0 },
        { url: '/login',          changefreq: 'weekly',  priority: 0.8 },
        { url: '/register',       changefreq: 'weekly',  priority: 0.9 },
        { url: '/blog',           changefreq: 'weekly',  priority: 0.7 },
        { url: '/about',          changefreq: 'monthly', priority: 0.5 },
        { url: '/contact',        changefreq: 'monthly', priority: 0.5 },
        { url: '/partner',        changefreq: 'monthly', priority: 0.5 },
        { url: '/privacy',        changefreq: 'monthly', priority: 0.3 },
        { url: '/terms',          changefreq: 'monthly', priority: 0.3 },
        { url: '/refund-policy',  changefreq: 'monthly', priority: 0.3 },
    ];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">`;

    // ── Static routes ─────────────────────────────────────────────────────────
    staticRoutes.forEach(r => {
        xml += urlEntry(`${baseUrl}${r.url}`, { lastmod: now, changefreq: r.changefreq, priority: r.priority });
    });

    // ── Dynamic blog routes ───────────────────────────────────────────────────
    try {
        const blogs = await Blog.findAll({
            where: { isPublished: true },
            attributes: ['id', 'slug', 'title', 'coverImage', 'updatedAt']
        });

        for (const blog of blogs) {
            if (!blog.slug) continue;
            const blogUpdated = blog.updatedAt ? new Date(blog.updatedAt).toISOString() : now;
            let imageXml = '';
            if (blog.coverImage) {
                const resolvedImg = blog.coverImage.startsWith('http') ? blog.coverImage : `${baseUrl}${blog.coverImage}`;
                imageXml = `
        <image:image>
            <image:loc>${escapeXml(resolvedImg)}</image:loc>
            <image:title>${escapeXml(blog.title || '')}</image:title>
        </image:image>`;
            }

            xml += `
    <url>
        <loc>${escapeXml(`${baseUrl}/blog/${blog.slug}`)}</loc>
        <lastmod>${blogUpdated}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.7</priority>${imageXml}
    </url>`;
        }
    } catch (err) {
        console.error('[Sitemap] Error fetching blog data:', err.message);
    }

    // ── Dynamic store routes ──────────────────────────────────────────────────
    try {
        const stores = await WaStore.findAll({
            where: { isActive: true },
            attributes: ['id', 'slug', 'categories', 'categoryImages', 'logo', 'updatedAt']
        });

        for (const store of stores) {
            if (!store.slug) continue;
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
                let images = product.imageUrls || [];
                if (typeof images === 'string') {
                    try { images = JSON.parse(images); } catch (_) { images = []; }
                }
                const firstImage = Array.isArray(images) ? images[0] : null;
                if (firstImage) {
                    const resolvedImg = firstImage.startsWith('http') ? firstImage : `${baseUrl}${firstImage}`;
                    imageXml = `
        <image:image>
            <image:loc>${escapeXml(resolvedImg)}</image:loc>
            <image:title>${escapeXml(product.name || '')}</image:title>
        </image:image>`;
                }

                xml += `
    <url>
        <loc>${escapeXml(productUrl)}</loc>
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
        const baseUrl = resolveBaseUrl(req);
        const xml = await buildSitemapXml(baseUrl);
        res.header('Content-Type', 'application/xml; charset=utf-8');
        res.header('Cache-Control', 'public, max-age=3600'); // cache 1 hour
        res.send(xml);
    } catch (err) {
        console.error('Sitemap Error:', err);
        res.status(500).send('Error generating sitemap');
    }
});

// @route   POST /sitemap.xml/generate
// @desc    Generate sitemap and save it as a physical file (for static hosting)
router.post('/generate', [auth, admin], async (req, res) => {
    try {
        const baseUrl = resolveBaseUrl(req);
        const xml = await buildSitemapXml(baseUrl);

        // Target locations to persist sitemap.xml:
        // 1. Server's public directory (e.g. /app/public/sitemap.xml in Docker, or server/public/sitemap.xml locally)
        // 2. Server's built frontend dist (if it exists, e.g. /app/public/dist/sitemap.xml)
        // 3. Client's public directory (if in local development, e.g. ../../client/public/sitemap.xml)
        const targets = [
            path.join(__dirname, '../public/sitemap.xml'),
            path.join(__dirname, '../public/dist/sitemap.xml'),
            path.join(__dirname, '../../client/public/sitemap.xml')
        ];

        let writtenCount = 0;
        for (const target of targets) {
            try {
                const dir = path.dirname(target);
                // Ensure server/public directory exists
                if (target === targets[0] && !fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }
                if (fs.existsSync(dir)) {
                    fs.writeFileSync(target, xml, 'utf8');
                    writtenCount++;
                }
            } catch (writeErr) {
                console.warn(`[Sitemap] Could not write to ${target}:`, writeErr.message);
            }
        }

        // Count entries for reporting
        const storeCount = (xml.match(/\/store\//g) || []).length;
        const totalUrls = (xml.match(/<loc>/g) || []).length;

        res.json({
            success: true,
            totalUrls,
            storeCount,
            savedLocations: writtenCount,
            message: `Sitemap generated with ${totalUrls} URLs (~${storeCount} store URLs) successfully.`
        });
    } catch (err) {
        console.error('Sitemap Generate Error:', err);
        res.status(500).json({ success: false, message: err.message || 'Error generating sitemap' });
    }
});

module.exports = router;
