/**
 * platformDomain.js
 * ------------------
 * Single source-of-truth for detecting whether the current browser hostname
 * belongs to YOUR SaaS platform or a MERCHANT'S custom domain.
 *
 * HOW IT WORKS (zero hardcoding):
 *   1. Reads VITE_API_URL (e.g. "https://api.onedash.cloud") from env at build time.
 *   2. Extracts the root domain from it (e.g. "onedash.cloud").
 *   3. At runtime, compares window.location.hostname against the extracted root domain.
 *
 * This means NO domain name needs to be hardcoded anywhere in the source code.
 * To rebrand, just update VITE_API_URL in .env — done.
 */

/**
 * Extracts the root domain (last two segments) from a URL string.
 * e.g. "https://api.onedash.cloud"  → "onedash.cloud"
 *      "http://localhost:5000"       → "localhost"
 *      "https://app.bluetick.cloud"  → "bluetick.cloud"
 */
function getRootDomain(urlString) {
    try {
        const url = new URL(urlString);
        const parts = url.hostname.split('.');
        // localhost or raw IP — return as-is
        if (parts.length <= 1) return url.hostname;
        // "api.onedash.cloud" → ["api","onedash","cloud"] → "onedash.cloud"
        return parts.slice(-2).join('.');
    } catch {
        return '';
    }
}

/**
 * The platform's root domain, derived automatically from VITE_API_URL.
 * If VITE_API_URL = "https://api.onedash.cloud" → "onedash.cloud"
 * Falls back to the current window origin so it's always self-consistent.
 */
export const PLATFORM_ROOT_DOMAIN = getRootDomain(
    import.meta.env.VITE_API_URL || window.location.origin
);

/**
 * Returns true if the given hostname belongs to the SaaS platform
 * (i.e. is NOT a merchant's custom domain).
 *
 * A hostname is "the platform" if ANY of the following are true:
 *   - It is localhost or 127.0.0.1  (local dev)
 *   - It is a raw numeric IP        (direct VPS access)
 *   - It equals or is a subdomain of PLATFORM_ROOT_DOMAIN
 *     (derived automatically from VITE_API_URL — zero hardcoding)
 *   - It is a known tunnelling/staging suffix (ngrok, railway, coolify)
 *
 * @param {string} [hostname=window.location.hostname]
 * @returns {boolean}
 */
export function isPlatformDomain(hostname = window.location.hostname) {
    // Local development
    if (hostname === 'localhost' || hostname === '127.0.0.1') return true;

    // Raw numeric IP (e.g. direct VPS access during setup)
    if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) return true;

    // Platform root domain and all its subdomains
    // e.g. "onedash.cloud" OR "app.onedash.cloud" OR "api.onedash.cloud"
    if (
        PLATFORM_ROOT_DOMAIN &&
        (hostname === PLATFORM_ROOT_DOMAIN || hostname.endsWith(`.${PLATFORM_ROOT_DOMAIN}`))
    ) return true;

    // Common tunnelling / preview / CI platforms (useful during dev/staging)
    if (
        hostname.includes('ngrok.io') ||
        hostname.includes('ngrok-free.app') ||
        hostname.includes('railway.app') ||
        hostname.includes('coolify') ||
        hostname.includes('bluetick.cloud')
    ) return true;

    return false;
}
