/**
 * cdnImage.js — Self-hosted image resize utility
 *
 * Routes image requests through our own /api/img proxy (imgProxy.js on the server),
 * which uses Sharp to resize images and returns them with 1-year cache headers.
 * Cloudflare caches the resized response at the edge after the first request —
 * making this effectively equivalent to Cloudflare Image Transformations, for free.
 *
 * URL format: /api/img?url=https://cdn.bluetick.cloud/xxx.webp&w=400&q=82&f=webp
 *
 * For non-CDN images (local/API-served), the URL is returned unchanged.
 */

const CDN_HOST = 'cdn.bluetick.cloud';
// VITE_API_URL in production = https://api.bluetick.cloud (the Express backend)
// Generates proxy URLs like: https://api.bluetick.cloud/api/img?url=...&w=400
const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || '';

/**
 * Returns an /api/img proxy URL for CDN-hosted images so the browser receives
 * a correctly-sized image. Non-CDN images are returned unchanged.
 *
 * @param {string} url         - Full image URL (already resolved by imgUrl())
 * @param {object} options
 * @param {number} options.width          - Target width in pixels
 * @param {number} [options.quality=82]   - Quality (1-100)
 * @param {string} [options.format='webp']- Output format: webp|avif|jpeg|png
 * @param {string} [options.fit='contain']- Fit mode: contain|cover
 * @returns {string}
 */
export function cdnImg(url, { width, quality = 82, format = 'webp', fit = 'contain' } = {}) {
    if (!url) return '';
    if (!width) return url;

    try {
        const parsed = new URL(url);

        // Only proxy CDN-hosted images — local/API images pass through unchanged
        if (parsed.hostname !== CDN_HOST) return url;

        const params = new URLSearchParams({
            url,
            w: String(width),
            q: String(quality),
            f: format,
            fit
        });

        return `${API_BASE}/api/img?${params.toString()}`;
    } catch {
        return url;
    }
}

/**
 * Generates a srcset string with multiple proxy URLs — one per width breakpoint.
 * The browser picks the best-matching width based on the sizes attribute.
 *
 * @param {string}   url     - Full CDN image URL
 * @param {number[]} widths  - Array of pixel widths (e.g. [400, 800, 1200])
 * @param {object}   [options] - Same options as cdnImg()
 * @returns {string}  Ready-to-use srcset attribute value
 *
 * @example
 * cdnSrcSet(heroUrl, [480, 800, 1200])
 * // → "/api/img?url=...&w=480 480w, /api/img?url=...&w=800 800w, ..."
 */
export function cdnSrcSet(url, widths, options = {}) {
    if (!url) return '';
    return widths
        .map(w => `${cdnImg(url, { ...options, width: w })} ${w}w`)
        .join(', ');
}
