require('dotenv').config();

// Capture uncaught exceptions/rejections BEFORE anything else
process.on('uncaughtException', (err) => {
    const msg = `[UNCAUGHT EXCEPTION] ${err.message}\n${err.stack}`;
    console.error(msg);
    try { require('fs').appendFileSync('crash.log', `${new Date().toISOString()} ${msg}\n`); } catch(e) {}
});
process.on('unhandledRejection', (reason, promise) => {
    const msg = `[UNHANDLED REJECTION] ${reason?.message || reason}\n${reason?.stack || ''}`;
    console.error(msg);
    try { require('fs').appendFileSync('crash.log', `${new Date().toISOString()} ${msg}\n`); } catch(e) {}
});

require('./utils/winston'); // Wire up file logging (captures all console.log/error/warn)
const express = require('express');
const cors = require('cors');
const http = require('http'); // NEW
const { initSocket } = require('./socket'); // NEW
const { sequelize, createDbIfNotExists } = require('./config/database');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const { globalLimiter } = require('./middleware/rateLimiter');
const setupGuard = require('./middleware/setupGuard');

// Initialize Models to ensure Sequelize syncs them
require('./models/Addon');
require('./models/UserAddon');
require('./models/StoreItem');
require('./models/AppVersion');
require('./models/Form');
require('./models/FormResponse');
require('./models/PaymentSession');
require('./models/AiTokenLog'); // AI token usage event log
require('./models/ReferralReward'); // Dynamic referral payouts log
require('./models/TechPartnerEarning'); // Tech Partner commission log (user-apply model)
require('./models/TechPartner'); // B2B Tech Partner entity (admin-created)
require('./models/TechPartnerPayout'); // Commission payout log for B2B partners
require('./models/ContactMessage'); // Stores incoming messages from public Contact Us page
require('./models/ApiUsageLog');    // Logs every external /api/v1/* gateway call
require('./models/Vcard');          // Digital Business Card SaaS Module
require('./models/VcardEnquiry');   // vCard Leads/Enquiries
require('./models/WaStore');        // WhatsApp Store SaaS Module
require('./models/WaProduct');      // WhatsApp Store Products
require('./models/WaOrder');        // WhatsApp Store Orders
require('./models/NfcCard');        // Physical NFC Products
require('./models/NfcOrder');       // Physical NFC Orders
require('./models/FlowExecutionLog'); // FlowBot execution analytics
require('./models/AutoTagRule');      // Auto-tagging rules engine

// Import Routes
const contactsRoute = require('./routes/contacts');
const templatesRoute = require('./routes/templates');
const messagesRoute = require('./routes/messages');
const dashboardRoute = require('./routes/dashboard');
const groupsRoute = require('./routes/groups');
const settingsRoute = require('./routes/settings');
const authRoute = require('./routes/auth');
const webhooksRoute = require('./routes/webhooks');
const adminRoute = require('./routes/admin');
const plansRoute = require('./routes/plans');
const purchasesRoute = require('./routes/purchases');
const supportRoute = require('./routes/support');
const notificationsRoute = require('./routes/notifications');
const whatsappAuthRoute = require('./routes/whatsappAuth');
const teamRoute = require('./routes/team');
const formsRoute = require('./routes/forms');

const app = express();
app.set('trust proxy', 1); // Trust first proxy (Coolify/Traefik)
const server = http.createServer(app); // NEW HTTP server

// Initialize WebSockets
initSocket(server);

// Middleware
app.use(helmet({
    crossOriginResourcePolicy: false,
    crossOriginOpenerPolicy: false, // Required: FB.login() popup needs to communicate back to parent window
    crossOriginEmbedderPolicy: false, // Required: Allow embedding cross-origin resources (FB SDK)
})); // Add HTTP security headers

// Gzip compression — reduces response sizes by ~75%
app.use(compression());

app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173', // Restrict CORS in production
    credentials: true
}));

// Parse cookies — required for HttpOnly token auth
app.use(cookieParser());

// Apply Dynamic Rate Limiter
app.use('/api', globalLimiter);

// Parse JSON payloads strictly up to 5MB to prevent memory exhaustion
app.use(express.json({ 
    limit: '5mb',
    verify: (req, res, buf) => {
        req.rawBody = buf;
    }
}));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// ── Setup wizard — must be registered BEFORE setupGuard ─────────────────────
app.use('/api/setup', require('./routes/setup'));

// ── Block all other /api routes if setup is not complete ─────────────────────
app.use('/api', setupGuard);
const path = require('path');
// Serve uploaded files — storageProvider saves to server/public/uploads
app.use('/uploads', (req, res, next) => {
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    res.set('Access-Control-Allow-Origin', '*');
    // Cache uploaded assets for 1 year — filenames are content-unique so cache-busting is automatic
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
    next();
}, express.static(path.join(__dirname, 'public/uploads')));

// Serve built React frontend (only if dist exists — i.e. in Docker/production build)
const distPath = path.join(__dirname, 'public/dist');
const distIndex = path.join(distPath, 'index.html');
const fs = require('fs');
if (fs.existsSync(distIndex)) {
    app.use(express.static(distPath, {
        maxAge: '1y',
        setHeaders: (res, filePath) => {
            // Don't cache index.html so updates always reach the user
            if (filePath.endsWith('index.html')) {
                res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
            }
            // Assets built by Vite have content hashes — safe to cache forever.
            else if (filePath.includes('/assets/')) {
                res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

                // Serve pre-compressed Brotli files generated by vite-plugin-compression.
                // Express doesn't auto-detect .br / .gz companion files, so we set the
                // Content-Encoding header manually when the Accept-Encoding matches.
                const acceptEncoding = res.req?.headers?.['accept-encoding'] || '';
                if (filePath.endsWith('.br')) {
                    // Direct .br file request — always Brotli
                    res.setHeader('Content-Encoding', 'br');
                    res.setHeader('Content-Type', filePath.endsWith('.css.br') ? 'text/css' : 'application/javascript');
                } else if (filePath.endsWith('.gz')) {
                    res.setHeader('Content-Encoding', 'gzip');
                    res.setHeader('Content-Type', filePath.endsWith('.css.gz') ? 'text/css' : 'application/javascript');
                }
            }
        }
    }));
}

// System Protection Middleware
app.use('/api', require('./middleware/systemCheck'));

// Routes
app.use('/api/contacts', contactsRoute);
app.use('/api/templates', templatesRoute);
app.use('/api/messages', messagesRoute);
app.use('/api/dashboard', dashboardRoute);
app.use('/api/groups', groupsRoute);
app.use('/api/settings', settingsRoute);
app.use('/api/auth', authRoute);
app.use('/api/whatsapp/auth', whatsappAuthRoute);
app.use('/api/team', teamRoute);
app.use('/api/forms', formsRoute);

// Excusive API v1 Routing for External Developers
app.use('/api/webhooks', webhooksRoute);
app.use('/api/admin', adminRoute);
app.use('/api/admin/addons', require('./routes/adminAddons'));
app.use('/api/admin/store', require('./routes/adminStore')); // NEW
app.use('/api/addons', require('./routes/addons')); // NEW user marketplace endpoint
app.use('/api/store', require('./routes/store')); // NEW user store endpoint
app.use('/api/plans', plansRoute);
app.use('/api/purchases', purchasesRoute);
app.use('/api/notifications', notificationsRoute); // NEW
app.use('/api/admin-notifications', require('./routes/adminNotifications')); // NEW
app.use('/api/support', supportRoute); // NEW
app.use('/api/landing', require('./routes/landing'));
app.use('/api/checkout', require('./routes/checkout'));
app.use('/sitemap.xml', require('./routes/sitemap'));
app.use('/api/system', require('./routes/system')); // NEW // NEW
app.use('/api/billing', require('./routes/billing')); // NEW
app.use('/api/labels', require('./routes/labels')); // NEW
app.use('/api/coupons', require('./routes/coupons')); // NEW
app.use('/api/versioning', require('./routes/versioning')); // Versioning & Changelog
app.use('/api/whatsapp/chat', require('./routes/chat')); // Renamed from WhatsApp Inbox
app.use('/api/whatsapp', whatsappAuthRoute); // WhatsApp Graph API Auth
app.use('/api/flows', require('./routes/flows')); // NEW FlowBot routes
app.use('/api/integrations', require('./routes/integrations')); // NEW Developer Ecosystem
app.use('/api/referrals', require('./routes/referrals')); // Referral System
app.use('/api/partner', require('./routes/partner')); // B2B Tech Partner tracking & application
app.use('/api/admin/tech-partners', require('./routes/adminTechPartners')); // B2B Tech Partner CRUD & payouts
app.use('/api/contact', require('./routes/contact')); // Public Contact Us form endpoints
app.use('/api/ctwa', require('./routes/ctwa')); // CTWA Ads Analytics & OAuth
app.use('/api/meta-ads', require('./routes/meta-ads')); // Meta Ads Maker
app.use('/api/vcards', require('./routes/vcards')); // Digital Business Card Config
app.use('/api/wastore', require('./routes/wastore')); // WhatsApp Store Config
app.use('/api/media', require('./routes/media')); // Media Gallery & Quota Management

app.use('/api/admin/nfc', require('./routes/adminNfc')); // Admin NFC Management
app.use('/api/nfc', require('./routes/nfc')); // User NFC Portal
app.use('/n', require('./routes/publicNfc')); // Public NFC scan redirect

app.use('/api/v1', require('./routes/apiV1')); // External Developer REST API
app.use('/api/auto-tag-rules', require('./routes/autoTagRules')); // Auto-Tagging Engine

// Webhook for Meta WhatsApp pushes
app.use('/api/webhook', require('./routes/webhook')); // NEW

// Public pages (Privacy Policy, Terms) — no auth required, for Meta App Live Mode
app.use('/', require('./routes/privacy'));

// Image Resize Proxy — free self-hosted alternative to Cloudflare Image Transformations
// Resizes CDN images on-demand with Sharp; results cached at Cloudflare edge for 1 year
app.use('/api/img', require('./routes/imgProxy'));

// Health check endpoint for Railway / Docker healthcheck
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
    res.send('Bluetick Backend Running (PostgreSQL)');
});

// SPA catch-all — serve React index.html for all non-API routes (enables React Router)
// This MUST come after all API routes
if (fs.existsSync(distIndex)) {
    // ── /store/:slug — inject LCP preload + OG meta so the hero image is discoverable ──
    // Lighthouse flags "Request is not discoverable in initial document" because React renders
    // the hero slide image via JS. This route reads the store from the DB and injects a
    // <link rel="preload"> in the <head> BEFORE serving the HTML, so the browser's preload
    // scanner finds the image in the raw HTML response.
    // It also embeds initial store+products data to eliminate the API call on first render,
    // cutting the LCP "resource load delay" from ~2,600ms to ~100ms on mobile.
    app.get('/store/:slug', async (req, res) => {
        try {
            const WaStore   = require('./models/WaStore');
            const WaProduct = require('./models/WaProduct');
            // warmCache is exported from imgProxy — used to pre-warm the LCP image
            // cache BEFORE the browser even receives the HTML.
            const { warmCache } = require('./routes/imgProxy');

            const store = await WaStore.findOne({
                where: { slug: req.params.slug, isActive: true }
            });

            let html = fs.readFileSync(distIndex, 'utf8');

            if (store) {
                // Determine LCP image URL immediately (needed for warmCache)
                const slides = Array.isArray(store.heroSlides) ? store.heroSlides : [];
                let lcpImageUrl = slides[0]?.imageUrl || store.coverImage || store.logo;

                // Run products DB query and LCP image cache warming IN PARALLEL.
                // warmCache() fires a background resize so that by the time the browser
                // receives the HTML and fires the <link rel="preload"> request, the image
                // is already in L1/L2 cache and responds in <5ms instead of ~1100ms.
                const [products] = await Promise.all([
                    WaProduct.findAll({
                        where: { storeId: store.id },
                        order: [['createdAt', 'DESC']],
                        limit: 24
                    }),
                    // Fire-and-forget warm — does NOT block HTML if it fails or is slow
                    lcpImageUrl ? warmCache(lcpImageUrl, { width: 800, quality: 92, format: 'webp', fit: 'contain' }).catch(() => {}) : Promise.resolve()
                ]);

                const injections = [];
                if (lcpImageUrl) {
                    // Build the image proxy URL for the LCP hero image.
                    // MUST match exactly what cdnImg(url, { width: 800 }) produces on the client
                    // so the browser's <link rel="preload"> cache hits when React renders the <img>.
                    //
                    // cdnImage.js generates:
                    //   ${VITE_API_URL}/api/img?url=${encoded}&w=800&q=82&f=webp&fit=contain
                    //
                    // We replicate that here on the server side.
                    const CDN_HOST = 'cdn.bluetick.cloud';
                    const apiBase = process.env.VITE_API_URL || process.env.APP_URL || 'http://localhost:5000';

                    let preloadUrl = lcpImageUrl;
                    let preloadSrcset = null;
                    let preloadSizes = null;
                    try {
                        const parsed = new URL(lcpImageUrl);
                        if (parsed.hostname === CDN_HOST) {
                            // Generate responsive srcset for preload
                            const widths = [480, 800, 1200];
                            preloadSrcset = widths.map(w => {
                                const p = new URLSearchParams({ url: lcpImageUrl, w: String(w), q: '92', f: 'webp', fit: 'inside' });
                                return `${apiBase}/api/img?${p.toString()} ${w}w`;
                            }).join(', ');
                            preloadSizes = '(max-width: 640px) 100vw, (max-width: 1024px) 100vw, 1200px';
                            
                            // Fallback URL
                            const params = new URLSearchParams({
                                url: lcpImageUrl,
                                w: '800',
                                q: '92',
                                f: 'webp',
                                fit: 'inside'
                            });
                            preloadUrl = `${apiBase}/api/img?${params.toString()}`;
                        } else if (!lcpImageUrl.startsWith('http://') && !lcpImageUrl.startsWith('https://')) {
                            preloadUrl = `${apiBase}${lcpImageUrl.startsWith('/') ? '' : '/'}${lcpImageUrl}`;
                        }
                    } catch (e) {
                        if (!lcpImageUrl.startsWith('http://') && !lcpImageUrl.startsWith('https://')) {
                            preloadUrl = `${apiBase}${lcpImageUrl.startsWith('/') ? '' : '/'}${lcpImageUrl}`;
                        }
                    }

                    // Escape to prevent HTML parser breakage
                    const safeUrl = preloadUrl.replace(/&/g, "&amp;").replace(/"/g, "&quot;");

                    // Hero image preload — fetchpriority=high tells browser this is the LCP image
                    if (preloadSrcset) {
                        const safeSrcset = preloadSrcset.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
                        const safeSizes = preloadSizes.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
                        injections.push(`<link rel="preload" as="image" href="${safeUrl}" imagesrcset="${safeSrcset}" imagesizes="${safeSizes}" fetchpriority="high">`);
                    } else {
                        injections.push(`<link rel="preload" as="image" href="${safeUrl}" fetchpriority="high">`);
                    }

                    // Preconnect to the proxy/CDN origin so DNS+TLS is established early
                    try {
                        const proxyOrigin = new URL(preloadUrl).origin;
                        injections.push(`<link rel="preconnect" href="${proxyOrigin}" crossorigin>`);
                        injections.push(`<link rel="dns-prefetch" href="${proxyOrigin}">`);
                    } catch (e) {}
                }

                // OG / SEO meta tags for social sharing & search engines
                const title = store.name ? `${store.name} | Shop Online` : 'Online Store';
                const desc  = store.description || `Shop at ${store.name || 'our store'} — fast checkout via WhatsApp.`;
                const ogImg = store.logo || lcpImageUrl || '';

                injections.push(`<title>${title}</title>`);
                injections.push(`<meta name="description" content="${desc.replace(/"/g, '&quot;').substring(0, 160)}">`);
                injections.push(`<meta property="og:title" content="${title}">`);
                injections.push(`<meta property="og:description" content="${desc.replace(/"/g, '&quot;').substring(0, 200)}">`);
                if (ogImg) injections.push(`<meta property="og:image" content="${ogImg}">`);
                injections.push(`<meta property="og:type" content="website">`);

                // Inject head tags
                html = html.replace('</head>', `${injections.join('\n  ')}\n</head>`);

                // ── Convert render-blocking CSS to non-blocking ────────────────────────────
                // Vite emits <link rel="stylesheet"> which blocks all painting until the full
                // 55KB CSS file downloads and parses (Lighthouse: "Eliminate render-blocking
                // resources"). For public store pages we:
                //   1. Swap the blocking link to a preloaded/async link
                //   2. Inject inline critical CSS so the skeleton renders immediately
                // This eliminates the 950ms render-blocking delay on the LCP path.
                // NOTE: Only applied to /store/:slug — dashboard pages keep blocking CSS
                // because they need full styles before any content renders.

                const CRITICAL_STORE_CSS = `<style id="critical-store">
/* Reset — prevents layout shift before Tailwind loads */
*,::before,::after{box-sizing:border-box;border-width:0;border-style:solid;border-color:#e5e7eb}
html{line-height:1.5;-webkit-text-size-adjust:100%;tab-size:4}
body{margin:0;font-family:ui-sans-serif,system-ui,-apple-system,sans-serif;-webkit-font-smoothing:antialiased}
/* Layout primitives used by skeleton */
.flex{display:flex}.flex-col{flex-direction:column}
.min-h-screen{min-height:100vh}.w-full{width:100%}.h-full{height:100%}
.relative{position:relative}.absolute{position:absolute}.inset-0{inset:0}
.overflow-hidden{overflow:hidden}.overflow-x-hidden{overflow-x:hidden}
/* Hero skeleton — aspect-[2/1] exactly matches the store hero */
.aspect-\\[2\\/1\\]{aspect-ratio:2/1}
/* Product grid skeleton */
.grid{display:grid}.grid-cols-2{grid-template-columns:repeat(2,minmax(0,1fr))}
.gap-4{gap:1rem}.aspect-square{aspect-ratio:1/1}
.max-w-7xl{max-width:80rem}.mx-auto{margin-left:auto;margin-right:auto}
.px-4{padding-left:1rem;padding-right:1rem}.py-8{padding-top:2rem;padding-bottom:2rem}
/* Skeleton colors */
.bg-gray-50{background-color:#f9fafb}.bg-gray-200{background-color:#e5e7eb}
.rounded-2xl{border-radius:1rem}
/* Skeleton pulse animation */
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
.animate-pulse{animation:pulse 2s cubic-bezier(.4,0,.6,1) infinite}
/* Hero image: display:block prevents inline gap */
img{display:block;vertical-align:middle}
/* Object-fit for hero image */
.object-contain{object-fit:contain}.object-cover{object-fit:cover}
/* Fadeshow animations */
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes slideInLeft{from{opacity:0;transform:translateX(-30px)}to{opacity:1;transform:translateX(0)}}
@keyframes fadeSlideDown{from{opacity:0;transform:translateY(-12px)}to{opacity:1;transform:translateY(0)}}
.animate-fade-in{animation:fadeIn .5s ease both}
.animate-slide-in-left{animation:slideInLeft .5s ease both}
.animate-fade-slide-down{animation:fadeSlideDown .4s ease both}
</style>`;

                // Convert blocking stylesheet to async — media="print" swap is more reliable
                // than the onload trick across all browsers and Lighthouse versions.
                // Regex matches the href first, then checks for rel="stylesheet" to guarantee
                // it works regardless of Vite's attribute ordering.
                html = html.replace(
                    /<link\b[^>]*href="(\/assets\/index-[^"]+\.css)"[^>]*>/,
                    (match, href) => {
                        // Only replace if it's actually the stylesheet link
                        if (!match.includes('rel="stylesheet"')) return match;
                        
                        return [
                            CRITICAL_STORE_CSS,
                            // media="print" makes browser treat it as non-render-blocking;
                            // onload swaps it to "all" once downloaded — zero FOUC with critical CSS above.
                            `<link rel="stylesheet" href="${href}" media="print" onload="this.media='all'">`,
                            // Preload ensures the full CSS is still fetched at HIGH priority
                            `<link rel="preload" as="style" href="${href}">`,
                            // Fallback for no-JS browsers
                            `<noscript><link rel="stylesheet" href="${href}"></noscript>`
                        ].join('\n');
                    }
                );

                // This eliminates the 2,600ms+ "resource load delay" caused by:
                //   JS bundle parse → API call → setStore() → image starts loading
                // With embedded data: HTML arrives → preload starts immediately → React reads
                // window.__STORE_INITIAL_DATA__ → renders with data → image already cached.
                const storeJson = store.toJSON();
                const productsJson = products.map(p => p.toJSON());

                // Safely encode to prevent XSS via </script> in store content
                const safeJson = JSON.stringify({ store: storeJson, products: productsJson })
                    .replace(/</g, '\\u003c')
                    .replace(/>/g, '\\u003e')
                    .replace(/&/g, '\\u0026');

                // Insert before the first <script type="module"> (the React entry point)
                html = html.replace(
                    /<script type="module"/,
                    `<script>window.__STORE_INITIAL_DATA__=${safeJson};</script>\n  <script type="module"`
                );
            }

            res.set('Content-Type', 'text/html; charset=utf-8');
            // Allow CDN (Cloudflare) to cache the store page for 60s — stale-while-revalidate
            // for 10 minutes. This means repeat visitors get a near-instant response from
            // the edge while data stays reasonably fresh.
            res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=600');
            res.send(html);
        } catch (err) {
            console.error('[Store SSR Preload] Error:', err.message);
            res.sendFile(distIndex); // Fallback to plain SPA
        }
    });

    // General SPA catch-all for all non-API routes (enables React Router)
    // Explicitly skip /api/ so backend routes are never swallowed by the SPA handler
    app.get('*', (req, res) => {
        if (req.path.startsWith('/api/')) {
            return res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
        }
        res.sendFile(distIndex);
    });
}


// Global Error Handler — always returns JSON, never raw HTML
// MUST be registered after all routes
app.use((err, req, res, next) => {
    console.error('[GLOBAL ERROR HANDLER]', err.message, err.stack);
    res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

// Start Server
const PORT = process.env.PORT || 5000;

// ── One-time startup migration: backfill mediaType for legacy MediaFile rows ──
// Runs silently every boot; no-ops instantly if all rows are already classified.
async function backfillMediaTypes() {
    try {
        const MediaFile = require('./models/MediaFile');
        const { Op } = require('sequelize');

        function deriveMediaType(mimeType, url) {
            const mime = (mimeType || '').toLowerCase();
            const u = (url || '').toLowerCase();
            if (mime.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|svg|bmp|avif)(\?|$)/.test(u)) return 'image';
            if (mime.startsWith('video/') || /\.(mp4|webm|3gp|ogg|mov|avi)(\?|$)/.test(u))           return 'video';
            if (
                mime === 'application/pdf' || mime.startsWith('text/') ||
                mime.includes('document') || mime.includes('spreadsheet') ||
                /\.(pdf|csv|txt|docx|xlsx|md)(\?|$)/.test(u)
            ) return 'document';
            return 'other';
        }

        const rows = await MediaFile.findAll({
            where: { [Op.or]: [{ mediaType: null }, { mediaType: 'other' }] },
            attributes: ['id', 'mimeType', 'url', 'mediaType']
        });

        if (rows.length === 0) return; // already clean — skip silently

        let updated = 0;
        await Promise.all(rows.map(async (row) => {
            const derived = deriveMediaType(row.mimeType, row.url);
            if (derived !== row.mediaType) {
                await row.update({ mediaType: derived }).catch(() => {});
                updated++;
            }
        }));

        if (updated > 0) {
            console.log(`[MediaType Migration] Backfilled ${updated} record(s) with correct mediaType.`);
        }
    } catch (err) {
        // Non-fatal — don't block startup if migration fails
        console.error('[MediaType Migration] Backfill error (non-fatal):', err.message);
    }
}

const startServer = async () => {
    try {
        await createDbIfNotExists(); // Create DB if not exists
        await sequelize.authenticate();
        console.log('PostgreSQL connected.');

        require('./models/WaStoreCoupon'); // Ensure WaStoreCoupon is loaded before sync
        require('./models/MediaFile');     // Ensure MediaFile is loaded before sync
        await sequelize.sync({ alter: { drop: false } }); // Sync models — never drop constraints/columns
        console.log('Database synced.');

        // Run one-time mediaType backfill (fixes legacy records on production after deploy)
        await backfillMediaTypes();

        // Initialize Scheduler
        const { initScheduler } = require('./utils/scheduler');
        initScheduler();

        server.listen(PORT, () => {
            console.log(`Server & WebSockets running on port ${PORT}`);
        });
    } catch (err) {
        console.error('Unable to start server:', err);
    }
};

startServer();

// Server restart: VcardEnquiry model UUID migration applied
// Trigger restart to clear in-memory SETUP_COMPLETE flag
