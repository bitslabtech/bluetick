/**
 * Image Resize Proxy — /api/img
 *
 * Self-hosted, Sharp-powered image resize proxy with aggressive multi-layer
 * caching to eliminate the LCP "Resource Load Delay" caused by cold-cache
 * proxy TTFB (~1140ms on Lighthouse cold runs).
 *
 * Caching strategy (fastest → slowest):
 *   L1: In-memory LRU (Map, max 200 entries) — <1ms, within process lifetime
 *   L2: Disk cache (/tmp/imgcache)            — <5ms, survives restarts in same container
 *   L3: Cloudflare edge (max-age=31536000)    — <20ms globally, survives deploys
 *   L4: Origin fetch + Sharp resize           — cold path, only on first-ever request
 *
 * Also exports warmCache() so the /store/:slug SSR handler can pre-warm the
 * LCP image cache BEFORE serving the HTML — eliminating the cold-path delay
 * even for the very first Lighthouse request.
 *
 * Security: Only images from cdn.bluetick.cloud are proxied.
 * Abuse prevention: Width capped at 2000px.
 */

const express = require('express');
const router = express.Router();
const sharp = require('sharp');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const CDN_HOST = 'cdn.bluetick.cloud';
const ALLOWED_FORMATS = ['webp', 'avif', 'jpeg', 'png'];
const MAX_WIDTH = 2000;
const MIN_WIDTH = 10;
const FETCH_TIMEOUT_MS = 12000;
const MIME_MAP = { webp: 'image/webp', avif: 'image/avif', jpeg: 'image/jpeg', png: 'image/png' };

// ── L1: In-Memory LRU Cache ────────────────────────────────────────────────────
const MAX_MEM_ENTRIES = 200;
const memCache = new Map();

function memGet(key) {
    const entry = memCache.get(key);
    if (!entry) return null;
    // Refresh LRU position
    memCache.delete(key);
    memCache.set(key, entry);
    return entry;
}

function memSet(key, value) {
    if (memCache.size >= MAX_MEM_ENTRIES) {
        // Evict oldest (first inserted) entry
        memCache.delete(memCache.keys().next().value);
    }
    memCache.set(key, value);
}

// ── L2: Disk Cache ─────────────────────────────────────────────────────────────
const DISK_CACHE_DIR = process.env.IMG_CACHE_DIR || '/tmp/imgcache';

try {
    if (!fs.existsSync(DISK_CACHE_DIR)) {
        fs.mkdirSync(DISK_CACHE_DIR, { recursive: true });
        console.log('[ImgProxy] Disk cache dir created:', DISK_CACHE_DIR);
    }
} catch (e) {
    console.warn('[ImgProxy] Could not create disk cache dir:', e.message);
}

function cacheKey(url, width, quality, format, fit) {
    return crypto
        .createHash('sha256')
        .update(`${url}|${width}|${quality}|${format}|${fit}`)
        .digest('hex');
}

function diskGet(key) {
    try {
        const imgPath  = path.join(DISK_CACHE_DIR, key);
        const metaPath = imgPath + '.meta';
        if (!fs.existsSync(imgPath) || !fs.existsSync(metaPath)) return null;
        const buffer      = fs.readFileSync(imgPath);
        const { contentType } = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
        return { buffer, contentType };
    } catch {
        return null;
    }
}

function diskSet(key, buffer, contentType) {
    try {
        const imgPath = path.join(DISK_CACHE_DIR, key);
        fs.writeFileSync(imgPath, buffer);
        fs.writeFileSync(imgPath + '.meta', JSON.stringify({ contentType, ts: Date.now() }));
    } catch (e) {
        // Non-fatal — Cloudflare edge still caches the response
        console.warn('[ImgProxy] Disk cache write failed:', e.message);
    }
}

// ── In-flight deduplication ────────────────────────────────────────────────────
// If the LCP preload and the <img> element request the same URL concurrently,
// only one fetch+resize is performed. All waiters share the Promise.
const inFlight = new Map();

// ── Core resize function ───────────────────────────────────────────────────────
async function resizeImage(url, width, quality, format, fit) {
    const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: FETCH_TIMEOUT_MS,
        maxContentLength: 20 * 1024 * 1024,
        headers: { 'User-Agent': 'Bluetick-ImgProxy/1.0' }
    });

    const pipeline = sharp(Buffer.from(response.data))
        .rotate()
        .resize(width, null, {
            fit: fit === 'cover' ? 'cover' : 'contain',
            withoutEnlargement: true
        });

    let buffer;
    switch (format) {
        case 'avif':  buffer = await pipeline.avif({ quality }).toBuffer(); break;
        case 'jpeg':  buffer = await pipeline.jpeg({ quality, mozjpeg: true }).toBuffer(); break;
        case 'png':   buffer = await pipeline.png({ compressionLevel: 8 }).toBuffer(); break;
        case 'webp':
        default:      buffer = await pipeline.webp({ quality }).toBuffer(); break;
    }

    return { buffer, contentType: MIME_MAP[format] || 'image/webp' };
}

// ── warmCache() ────────────────────────────────────────────────────────────────
/**
 * Pre-warm the disk+memory cache for a given image URL.
 *
 * Called by the /store/:slug SSR handler BEFORE sending the HTML response.
 * This way, when the browser fires the <link rel="preload"> request, the image
 * is already in L1/L2 cache and responds in <5ms instead of ~1100ms.
 *
 * Fire-and-forget: intentionally does NOT block the HTML response.
 * The warm operation runs concurrently with HTML delivery.
 *
 * @param {string} url - CDN image URL (must be cdn.bluetick.cloud)
 * @param {object} [opts] - Same options as cdnImg()
 */
async function warmCache(url, { width = 800, quality = 92, format = 'webp', fit = 'contain' } = {}) {
    try {
        const parsed = new URL(url);
        if (parsed.hostname !== CDN_HOST) return;

        const w   = Math.min(Math.max(parseInt(width),   MIN_WIDTH), MAX_WIDTH);
        const q   = Math.min(100, Math.max(1, parseInt(quality) || 82));
        const f   = ALLOWED_FORMATS.includes(format) ? format : 'webp';
        const key = cacheKey(url, w, q, f, fit);

        // Already hot in L1
        if (memCache.has(key)) return;

        // Already on disk — promote to L1
        const diskHit = diskGet(key);
        if (diskHit) {
            memSet(key, diskHit);
            return;
        }

        // Cold — fetch+resize in background (deduplicated)
        if (!inFlight.has(key)) {
            const promise = resizeImage(url, w, q, f, fit)
                .then(result => {
                    memSet(key, result);
                    diskSet(key, result.buffer, result.contentType);
                    inFlight.delete(key);
                })
                .catch(err => {
                    inFlight.delete(key);
                    console.warn('[ImgProxy] warmCache failed for', url, ':', err.message);
                });
            inFlight.set(key, promise);
        }
        // Intentionally NOT awaited — fire-and-forget
    } catch (e) {
        console.warn('[ImgProxy] warmCache error:', e.message);
    }
}

// ── HTTP Handler ───────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
    const { url, w, q = '82', f = 'webp', fit = 'contain' } = req.query;

    // Input validation
    if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: 'Missing required parameter: url' });
    }

    let parsedUrl;
    try {
        parsedUrl = new URL(url);
    } catch {
        return res.status(400).json({ error: 'Invalid URL format' });
    }

    if (parsedUrl.hostname !== CDN_HOST) {
        return res.status(403).json({ error: `Only images from ${CDN_HOST} are allowed` });
    }

    if (parsedUrl.pathname.includes('..')) {
        return res.status(400).json({ error: 'Invalid path' });
    }

    const width   = parseInt(w);
    if (!width || width < MIN_WIDTH || width > MAX_WIDTH) {
        return res.status(400).json({ error: `Width must be between ${MIN_WIDTH} and ${MAX_WIDTH}` });
    }

    const quality = Math.min(100, Math.max(1, parseInt(q) || 82));
    const format  = ALLOWED_FORMATS.includes(f) ? f : 'webp';
    const fitMode = fit === 'cover' ? 'cover' : 'contain';
    const key     = cacheKey(url, width, quality, format, fitMode);

    // Helper to send cached response
    function sendCached({ buffer, contentType }, cacheLabel) {
        res.set('Content-Type', contentType);
        res.set('Content-Length', buffer.length);
        res.set('Cache-Control', 'public, max-age=31536000, immutable');
        res.set('Vary', 'Accept');
        res.set('X-Cache', cacheLabel);
        return res.send(buffer);
    }

    try {
        // L1: Memory
        const memHit = memGet(key);
        if (memHit) return sendCached(memHit, 'HIT-MEM');

        // L2: Disk
        const diskHit = diskGet(key);
        if (diskHit) {
            memSet(key, diskHit);
            return sendCached(diskHit, 'HIT-DISK');
        }

        // L4: Cold path — fetch + resize (deduplicated across concurrent requests)
        let promise = inFlight.get(key);
        if (!promise) {
            promise = resizeImage(url, width, quality, format, fitMode)
                .then(result => {
                    memSet(key, result);
                    diskSet(key, result.buffer, result.contentType);
                    inFlight.delete(key);
                    return result;
                })
                .catch(err => {
                    inFlight.delete(key);
                    throw err;
                });
            inFlight.set(key, promise);
        }

        const result = await promise;
        res.set('X-Img-Proxy', `w=${width},q=${quality},f=${format},fit=${fitMode}`);
        return sendCached(result, 'MISS');

    } catch (err) {
        console.error('[ImgProxy] Error processing', url, ':', err.message);
        // Graceful degradation — redirect to original CDN URL
        return res.redirect(302, url);
    }
});

module.exports = router;
module.exports.warmCache = warmCache;
