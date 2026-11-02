const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const WaStore = require('../models/WaStore');
const WaProduct = require('../models/WaProduct');
const Blog = require('../models/Blog');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const fs = require('fs');
const path = require('path');

// ─── Platform-host detection ──────────────────────────────────────────────────
// Matches the same logic as server/routes/robots.js and server/index.js.
const _platformDomain = (process.env.PLATFORM_DOMAIN || '')
    .toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '');
const _extraPlatformDomains = (process.env.EXTRA_PLATFORM_DOMAINS || '')
    .split(',')
    .map(d => d.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, ''))
    .filter(Boolean);
const PAAS_PATTERNS = [
    'sslip.io', 'nip.io', 'traefik.me',
    'ngrok.io', 'ngrok-free.app',
    'railway.app', 'onrender.com', 'vercel.app', 'netlify.app',
    'workers.dev'
];

function isPlatformHost(hostname) {
    if (!hostname) return true;
    const h = hostname.toLowerCase().split(':')[0];
    if (h === 'localhost' || h === '127.0.0.1') return true;
    if (/^(\d{1,3}\.){3}\d{1,3}$/.test(h)) return true;
    if (PAAS_PATTERNS.some(p => h.includes(p))) return true;
    if (_platformDomain && (h === _platformDomain || h.endsWith(`.${_platformDomain}`))) return true;
    if (_extraPlatformDomains.some(d => h === d || h.endsWith(`.${d}`))) return true;
    if (h === 'onedash.cloud'  || h.endsWith('.onedash.cloud'))  return true;
    if (h === 'bluetick.cloud' || h.endsWith('.bluetick.cloud')) return true;
    return false;
}

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

// ─── Helper: resolve base URL for platform ────────────────────────────────────
async function resolveBaseUrl(req) {
    if (req?.body?.baseUrl && typeof req.body.baseUrl === 'string') {
        const customUrl = req.body.baseUrl.trim();
        if (customUrl && !customUrl.includes('localhost') && !customUrl.includes('127.0.0.1')) {
            const formatted = customUrl.startsWith('http') ? customUrl : `https://${customUrl}`;
            return formatted.replace(/\/+$/, '');
        }
    }

    try {
        const LandingPage = require('../models/LandingPage');
        const landing = await LandingPage.findOne({ attributes: ['seo'] });
        const canonical = landing?.seo?.canonicalUrl?.trim();
        if (canonical && !canonical.includes('localhost') && !canonical.includes('127.0.0.1')) {
            const formatted = canonical.startsWith('http') ? canonical : `https://${canonical}`;
            return formatted.replace(/\/+$/, '');
        }
    } catch (_) {}

    if (process.env.PLATFORM_DOMAIN && !process.env.PLATFORM_DOMAIN.includes('localhost')) {
        const domain = process.env.PLATFORM_DOMAIN.replace(/^https?:\/\//, '').replace(/\/+$/, '');
        return `https://${domain}`;
    }

    for (const envUrl of [process.env.FRONTEND_URL, process.env.BASE_URL]) {
        if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
            return envUrl.replace(/\/+$/, '');
        }
    }

    if (req) {
        const host = (req.headers['x-forwarded-host'] || req.get('host') || '').toLowerCase();
        if (host && !host.includes('localhost') && !host.includes('127.0.0.1')) {
            const proto = req.headers['x-forwarded-proto'] || req.protocol || 'https';
            return `${proto}://${host}`;
        }
    }

    return process.env.FRONTEND_URL || 'http://localhost:5173';
}

// ─── Builder: Merchant Store Dedicated Sitemap ────────────────────────────────
// Served when Googlebot visits e.g. https://www.amardryfruits.in/sitemap.xml
// Contains ONLY that specific store's pages, categories, and products.
async function buildStoreSitemapXml(requestHost, req) {
    const now = new Date().toISOString();
    const proto = req?.headers['x-forwarded-proto'] || 'https';
    const storeBaseUrl = `${proto}://${requestHost}`;

    const lookupHostname = requestHost.startsWith('www.') ? requestHost.slice(4) : requestHost;

    const store = await WaStore.findOne({
        where: {
            customDomain: [lookupHostname, `www.${lookupHostname}`],
            isActive: true
        }
    });

    if (!store) {
        return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`;
    }

    const storeUpdated = store.updatedAt ? new Date(store.updatedAt).toISOString() : now;

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">`;

    // 1. Store Homepage
    xml += urlEntry(`${storeBaseUrl}/`, {
        lastmod: storeUpdated,
        changefreq: 'daily',
        priority: 1.0
    });

    // 2. Categories listing page
    xml += urlEntry(`${storeBaseUrl}/categories`, {
        lastmod: storeUpdated,
        changefreq: 'weekly',
        priority: 0.8
    });

    // 3. Category pages
    let categories = [];
    try {
        categories = Array.isArray(store.categories)
            ? store.categories
            : (typeof store.categories === 'string' ? JSON.parse(store.categories) : []);
    } catch (_) {}

    for (const cat of categories) {
        if (!cat) continue;
        xml += urlEntry(`${storeBaseUrl}/category/${encodeURIComponent(cat)}`, {
            lastmod: storeUpdated,
            changefreq: 'weekly',
            priority: 0.8
        });
    }

    // 4. Products
    try {
        const products = await WaProduct.findAll({
            where: { storeId: store.id, inStock: true },
            attributes: ['id', 'name', 'imageUrls', 'updatedAt']
        });

        for (const product of products) {
            const productUrl = `${storeBaseUrl}/product/${product.id}`;
            const productUpdated = product.updatedAt ? new Date(product.updatedAt).toISOString() : now;

            let imageXml = '';
            let images = product.imageUrls || [];
            if (typeof images === 'string') {
                try { images = JSON.parse(images); } catch (_) { images = []; }
            }
            const firstImage = Array.isArray(images) ? images[0] : null;
            if (firstImage) {
                const resolvedImg = firstImage.startsWith('http') ? firstImage : `${storeBaseUrl}${firstImage.startsWith('/') ? '' : '/'}${firstImage}`;
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
        <changefreq>weekly</changefreq>
        <priority>0.9</priority>${imageXml}
    </url>`;
        }
    } catch (prodErr) {
        console.error('[Sitemap Store] Error fetching products:', prodErr.message);
    }

    // 5. Store Policy Pages (Google Merchant trust signals)
    const storePages = [
        '/pages/about-us',
        '/pages/contact-us',
        '/pages/privacy-policy',
        '/pages/terms-and-conditions',
        '/pages/return-policy',
        '/pages/shipping-policy'
    ];

    for (const pagePath of storePages) {
        xml += urlEntry(`${storeBaseUrl}${pagePath}`, {
            lastmod: storeUpdated,
            changefreq: 'monthly',
            priority: 0.5
        });
    }

    xml += `\n</urlset>`;
    return xml;
}

// ─── Builder: OneDash Platform Sitemap ────────────────────────────────────────
// Served when Googlebot visits https://onedash.cloud/sitemap.xml
// Excludes any store that has a verified custom domain to prevent duplicate content.
async function buildPlatformSitemapXml(baseUrl) {
    const now = new Date().toISOString();

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

    // 1. Static SaaS routes
    staticRoutes.forEach(r => {
        xml += urlEntry(`${baseUrl}${r.url}`, { lastmod: now, changefreq: r.changefreq, priority: r.priority });
    });

    // 2. Dynamic blog routes
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
        console.error('[Sitemap Platform] Error fetching blog data:', err.message);
    }

    // 3. Dynamic stores: ONLY stores WITHOUT a verified custom domain.
    // Stores with verified custom domains are indexed on their own domain sitemaps.
    try {
        const stores = await WaStore.findAll({
            where: {
                isActive: true,
                [Op.or]: [
                    { customDomain: null },
                    { customDomain: '' },
                    { domainStatus: { [Op.ne]: 'verified' } },
                    { domainStatus: null }
                ]
            },
            attributes: ['id', 'slug', 'categories', 'categoryImages', 'logo', 'updatedAt']
        });

        for (const store of stores) {
            if (!store.slug) continue;
            const storeUpdated = store.updatedAt ? new Date(store.updatedAt).toISOString() : now;
            const storeUrl = `${baseUrl}/store/${store.slug}`;

            // Store home
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

            // Products
            const products = await WaProduct.findAll({
                where: { storeId: store.id, inStock: true },
                attributes: ['id', 'name', 'imageUrls', 'updatedAt']
            });

            for (const product of products) {
                const productUrl = `${storeUrl}/product/${product.id}`;
                const productUpdated = product.updatedAt ? new Date(product.updatedAt).toISOString() : now;

                let imageXml = '';
                let images = product.imageUrls || [];
                if (typeof images === 'string') {
                    try { images = JSON.parse(images); } catch (_) { images = []; }
                }
                const firstImage = Array.isArray(images) ? images[0] : null;
                if (firstImage) {
                    const resolvedImg = firstImage.startsWith('http') ? firstImage : `${baseUrl}${firstImage.startsWith('/') ? '' : '/'}${firstImage}`;
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
        console.error('[Sitemap Platform] Error fetching store data:', err.message);
    }

    xml += `\n</urlset>`;
    return xml;
}

// ─── Main Route: GET /sitemap.xml ─────────────────────────────────────────────
router.get('/', async (req, res) => {
    try {
        const requestHost = (
            req.headers['x-forwarded-host'] || req.get('host') || ''
        ).toLowerCase().split(':')[0];

        res.header('Content-Type', 'application/xml; charset=utf-8');
        res.header('Cache-Control', 'public, max-age=3600'); // cache 1 hour

        // If request is from a merchant custom domain, serve their isolated store sitemap
        if (!isPlatformHost(requestHost) && requestHost) {
            const xml = await buildStoreSitemapXml(requestHost, req);
            return res.send(xml);
        }

        // Otherwise serve OneDash SaaS platform sitemap
        const baseUrl = await resolveBaseUrl(req);
        const xml = await buildPlatformSitemapXml(baseUrl);
        return res.send(xml);
    } catch (err) {
        console.error('[Sitemap] Error generating sitemap:', err);
        res.status(500).send('Error generating sitemap');
    }
});

// ─── Admin Route: POST /sitemap.xml/generate ──────────────────────────────────
// Manually persist platform sitemap to disk for static hosting fallback
router.post('/generate', [auth, admin], async (req, res) => {
    try {
        const baseUrl = await resolveBaseUrl(req);
        const xml = await buildPlatformSitemapXml(baseUrl);

        const targets = [
            path.join(__dirname, '../public/sitemap.xml'),
            path.join(__dirname, '../public/dist/sitemap.xml'),
            path.join(__dirname, '../../client/public/sitemap.xml')
        ];

        let writtenCount = 0;
        for (const target of targets) {
            try {
                const dir = path.dirname(target);
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

        const storeCount = (xml.match(/\/store\//g) || []).length;
        const totalUrls = (xml.match(/<loc>/g) || []).length;

        res.json({
            success: true,
            totalUrls,
            storeCount,
            savedLocations: writtenCount,
            message: `Platform sitemap generated with ${totalUrls} URLs (~${storeCount} store URLs) successfully.`
        });
    } catch (err) {
        console.error('Sitemap Generate Error:', err);
        res.status(500).json({ success: false, message: err.message || 'Error generating sitemap' });
    }
});

module.exports = router;
