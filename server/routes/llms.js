const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const WaStore = require('../models/WaStore');
const WaProduct = require('../models/WaProduct');

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
    'workers.dev',
];

function isPlatformHost(hostname) {
    if (!hostname) return true;
    const h = hostname.toLowerCase().split(':')[0];
    if (h === 'localhost' || h === '127.0.0.1') return true;
    if (/^(\d{1,3}\.){3}\d{1,3}$/.test(h)) return true;
    if (PAAS_PATTERNS.some(p => h.includes(p))) return true;
    if (_platformDomain && (h === _platformDomain || h.endsWith(`.${_platformDomain}`))) return true;
    if (_extraPlatformDomains.some(d => h === d || h.endsWith(`.${d}`))) return true;
    if (h === 'onedash.cloud' || h.endsWith('.onedash.cloud')) return true;
    if (h === 'bluetick.cloud' || h.endsWith('.bluetick.cloud')) return true;
    return false;
}

function slugifyProduct(productOrName, id) {
    let name = productOrName;
    if (productOrName && typeof productOrName === 'object') {
        if (productOrName.slug) return productOrName.slug;
        name = productOrName.name;
        id = productOrName.id;
    }
    const nameSlug = (name || '')
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_]+/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 60);
    const shortId = id ? id.replace(/-/g, '').slice(0, 8) : '';
    return shortId ? `${nameSlug}--${shortId}` : nameSlug;
}

// Generate store markdown manifest
function generateStoreLlms(store, products, storeOrigin) {
    const currency = store.currency || 'USD';
    const lines = [
        `# ${store.name || 'Online Store'} — Official Storefront`,
        ``,
        `> ${store.description || `Shop products online from ${store.name}. Quick ordering and support via WhatsApp.`}`,
        ``,
        `## Store Overview`,
        `- Store URL: ${storeOrigin}`,
        `- Primary Currency: ${currency}`,
        `- Support WhatsApp: ${store.whatsappNumber ? `https://wa.me/${store.whatsappNumber.replace(/\\D/g, '')}` : 'N/A'}`,
        `- Contact Email: ${store.email || 'N/A'}`,
        ``,
        `## Store Navigation & Pages`,
        `- Storefront: ${storeOrigin}/`,
        `- All Categories: ${storeOrigin}/categories`,
        `- Privacy Policy: ${storeOrigin}/pages/privacy`,
        `- Terms of Service: ${storeOrigin}/pages/terms`,
        `- Return & Refund Policy: ${storeOrigin}/pages/return`,
        ``,
        `## Products & Catalog (${products.length} active products)`,
        ``,
    ];

    if (products.length === 0) {
        lines.push(`_No products currently listed._`);
    } else {
        products.forEach(p => {
            const productSlug = slugifyProduct(p, p.id);
            const productUrl = `${storeOrigin}/product/${productSlug}`;
            const price = parseFloat(p.price || 0).toFixed(2);
            const desc = (p.description || '').replace(/[\r\n]+/g, ' ').slice(0, 150);
            lines.push(`- [${p.name}](${productUrl}) — ${currency} ${price}${p.category ? ` (${p.category})` : ''}: ${desc}`);
        });
    }

    lines.push(``);
    lines.push(`## Ordering Information`);
    lines.push(`Customers can browse the catalog and place orders directly with WhatsApp checkout support.`);
    lines.push(``);

    return lines.join('\n');
}

// Handler for custom domains or store slugs
async function handleStoreLlms(req, res, storeSlug) {
    try {
        const proto = req.headers['x-forwarded-proto'] || 'https';
        const requestHost = (
            req.headers['x-forwarded-host'] || req.get('host') || ''
        ).toLowerCase().split(':')[0];

        let store = null;
        if (storeSlug) {
            store = await WaStore.findOne({ where: { slug: storeSlug, isActive: true } });
        } else {
            const lookupHostname = requestHost.startsWith('www.') ? requestHost.slice(4) : requestHost;
            store = await WaStore.findOne({
                where: {
                    customDomain: [lookupHostname, `www.${lookupHostname}`],
                    isActive: true,
                }
            });
        }

        if (!store) {
            return res.status(404).type('text/plain').send('Store not found or inactive');
        }

        const products = await WaProduct.findAll({
            where: { storeId: store.id, isActive: true },
            order: [['createdAt', 'DESC']],
            limit: 100,
        });

        const storeOrigin = store.customDomain && store.domainStatus === 'verified'
            ? `https://${store.customDomain}`
            : `${proto}://${requestHost}/store/${store.slug}`;

        const markdown = generateStoreLlms(store, products, storeOrigin);

        res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
        res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
        return res.send(markdown);
    } catch (err) {
        console.error('[Store llms.txt] Error:', err);
        return res.status(500).type('text/plain').send('Error generating llms.txt');
    }
}

// GET /llms.txt
router.get('/', async (req, res) => {
    const requestHost = (
        req.headers['x-forwarded-host'] || req.get('host') || ''
    ).toLowerCase().split(':')[0];

    // Case 1: Merchant custom domain
    if (!isPlatformHost(requestHost) && requestHost) {
        return handleStoreLlms(req, res);
    }

    // Case 2: Platform domain (OneDash)
    const candidates = [
        path.join(__dirname, '../../client/public/llms.txt'),
        path.join(__dirname, '../public/llms.txt'),
        path.join(__dirname, '../public/dist/llms.txt'),
    ];

    for (const filePath of candidates) {
        if (fs.existsSync(filePath)) {
            res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
            res.setHeader('Cache-Control', 'public, max-age=3600');
            return res.send(fs.readFileSync(filePath, 'utf8'));
        }
    }

    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    return res.send('# OneDash\nVisit https://onedash.cloud for more information.\n');
});

// GET /store/:slug/llms.txt
router.get('/store/:slug', async (req, res) => {
    return handleStoreLlms(req, res, req.params.slug);
});

module.exports = router;

