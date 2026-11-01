/**
 * isPlatformDomain — single source of truth for "is this host the SaaS platform?"
 *
 * Returns true when the current hostname is the platform itself (not a merchant's
 * custom store domain). Rules, in order:
 *  1. localhost / 127.0.0.1 / *.local
 *  2. Direct IP address access (e.g. http://187.127.171.15)
 *  3. Well-known PaaS/dynamic-DNS hostnames (sslip.io, nip.io, railway.app, etc.)
 *  4. VITE_PLATFORM_DOMAIN env var — the ONE place you set your domain
 *  5. Legacy fallback: bluetick.cloud / whatsapp-cloud.com
 *
 * To add a staging subdomain (e.g. staging.myapp.com), just set:
 *   VITE_PLATFORM_DOMAIN=myapp.com
 * Both myapp.com AND staging.myapp.com will be recognised automatically.
 *
 * @param {string} [hostname] - override for testing; defaults to window.location.hostname
 */
export function isPlatformDomain(hostname = (typeof window !== 'undefined' ? window.location.hostname : '')) {
    if (!hostname) return true;

    const host = hostname.toLowerCase();

    // 1. Local development
    if (host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local')) {
        return true;
    }

    // 2. Direct IP address (e.g. http://187.127.171.15 — Coolify raw IP access)
    if (/^(\d{1,3}\.){3}\d{1,3}$/.test(host)) {
        return true;
    }

    // 3. PaaS & Dynamic DNS — never a merchant custom domain
    const paasPatterns = ['sslip.io', 'nip.io', 'traefik.me', 'ngrok.io', 'ngrok-free.app', 'railway.app', 'onrender.com', 'vercel.app', 'netlify.app'];
    if (paasPatterns.some(p => host.includes(p))) {
        return true;
    }

    // 4. VITE_PLATFORM_DOMAIN — set once in .env, covers domain AND all its subdomains
    const platformDomain = (import.meta.env.VITE_PLATFORM_DOMAIN || '').toLowerCase().replace(/^https?:\/\//, '').split('/')[0];
    if (platformDomain) {
        if (host === platformDomain || host.endsWith(`.${platformDomain}`)) {
            return true;
        }
    }

    // 5. Dual-domain & legacy defaults (bluetick.cloud and onedash.cloud)
    if (host.includes('bluetick.cloud') || host.includes('onedash.cloud') || host.includes('whatsapp-cloud.com')) {
        return true;
    }

    return false;
}

/**
 * getStoreRoute — builds the correct URL for a store link.
 *
 * On the platform domain:  /store/:slug/path
 * On a merchant custom domain: /path  (slug is implicit from the domain itself)
 */
export function getStoreRoute(slug, path = '') {
    // Ensure path starts with a slash if provided
    const normalizedPath = path && !path.startsWith('/') && !path.startsWith('?') ? `/${path}` : path;

    if (isPlatformDomain()) {
        return `/store/${slug}${normalizedPath}`;
    } else {
        return normalizedPath || '/';
    }
}
