/**
 * Image Resize Proxy — /api/img
 *
 * Self-hosted, Sharp-powered image resize proxy.
 * Works as a free alternative to Cloudflare Image Transformations.
 *
 * How it works:
 *  1. Browser requests /api/img?url=https://cdn.bluetick.cloud/xxx.webp&w=400
 *  2. Server fetches the original from CDN, resizes with Sharp
 *  3. Returns with Cache-Control: max-age=31536000 (1 year, immutable)
 *  4. Cloudflare caches the resized response at the edge
 *  5. All future requests for same URL/width served instantly from Cloudflare
 *
 * Security: Only images from cdn.bluetick.cloud are allowed.
 * Abuse prevention: Width capped at 2000px.
 */

const express = require('express');
const router = express.Router();
const sharp = require('sharp');
const axios = require('axios');

const CDN_HOST = 'cdn.bluetick.cloud';
const ALLOWED_FORMATS = ['webp', 'avif', 'jpeg', 'png'];
const MAX_WIDTH = 2000;
const MIN_WIDTH = 10;
const FETCH_TIMEOUT_MS = 12000;

/**
 * GET /api/img
 *
 * Query params:
 *   url  {string}  Original CDN image URL (must be cdn.bluetick.cloud)
 *   w    {number}  Target width in pixels (10–2000)
 *   q    {number}  Quality (1–100, default 82)
 *   f    {string}  Output format: webp | avif | jpeg | png (default webp)
 *   fit  {string}  Resize fit: contain | cover (default contain)
 */
router.get('/', async (req, res) => {
    const { url, w, q = '82', f = 'webp', fit = 'contain' } = req.query;

    // ── Input Validation ────────────────────────────────────────────────────

    if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: 'Missing required parameter: url' });
    }

    let parsedUrl;
    try {
        parsedUrl = new URL(url);
    } catch {
        return res.status(400).json({ error: 'Invalid URL format' });
    }

    // Only serve images from our CDN — prevents open proxy abuse
    if (parsedUrl.hostname !== CDN_HOST) {
        return res.status(403).json({ error: `Only images from ${CDN_HOST} are allowed` });
    }

    // Reject if path contains traversal attempts
    if (parsedUrl.pathname.includes('..')) {
        return res.status(400).json({ error: 'Invalid path' });
    }

    const width = parseInt(w);
    if (!width || width < MIN_WIDTH || width > MAX_WIDTH) {
        return res.status(400).json({ error: `Width must be between ${MIN_WIDTH} and ${MAX_WIDTH}` });
    }

    const quality = Math.min(100, Math.max(1, parseInt(q) || 82));
    const format = ALLOWED_FORMATS.includes(f) ? f : 'webp';
    const fitMode = fit === 'cover' ? 'cover' : 'contain';

    try {
        // ── Fetch Original from CDN ──────────────────────────────────────────
        const response = await axios.get(url, {
            responseType: 'arraybuffer',
            timeout: FETCH_TIMEOUT_MS,
            maxContentLength: 20 * 1024 * 1024, // 20MB max source image
            headers: { 'User-Agent': 'Bluetick-ImgProxy/1.0' }
        });

        const originalBuffer = Buffer.from(response.data);

        // ── Resize with Sharp ────────────────────────────────────────────────
        // height: null = maintain aspect ratio automatically
        const pipeline = sharp(originalBuffer)
            .rotate() // Auto-rotate based on EXIF orientation
            .resize(width, null, {
                fit: fitMode,
                withoutEnlargement: true // Never upscale — return original if smaller
            });

        let resizedBuffer;
        let contentType;

        switch (format) {
            case 'avif':
                resizedBuffer = await pipeline.avif({ quality }).toBuffer();
                contentType = 'image/avif';
                break;
            case 'jpeg':
                resizedBuffer = await pipeline.jpeg({ quality, mozjpeg: true }).toBuffer();
                contentType = 'image/jpeg';
                break;
            case 'png':
                resizedBuffer = await pipeline.png({ compressionLevel: 8 }).toBuffer();
                contentType = 'image/png';
                break;
            case 'webp':
            default:
                resizedBuffer = await pipeline.webp({ quality }).toBuffer();
                contentType = 'image/webp';
        }

        // ── Respond with long-lived cache ────────────────────────────────────
        // The URL contains all transform params so the same URL always produces
        // the same bytes — safe to cache immutably for 1 year.
        // Cloudflare will cache this at its edge on first request.
        res.set('Content-Type', contentType);
        res.set('Content-Length', resizedBuffer.length);
        res.set('Cache-Control', 'public, max-age=31536000, immutable');
        res.set('Vary', 'Accept');
        res.set('X-Img-Proxy', `w=${width},q=${quality},f=${format},fit=${fitMode}`);

        return res.send(resizedBuffer);

    } catch (err) {
        console.error('[ImgProxy] Error processing', url, ':', err.message);

        // Graceful degradation — redirect to original so image still displays
        return res.redirect(302, url);
    }
});

module.exports = router;
