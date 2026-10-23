import { isPlatformDomain } from './platformDomain';

/**
 * Determines the correct URL routing for the store.
 * If accessed via a Custom Domain, it strips the `/store/:slug` prefix
 * to keep the URL clean (e.g. `www.domain.com/product/123`).
 * If accessed via the platform domain, it keeps the prefix.
 *
 * Platform detection is fully dynamic — driven by VITE_API_URL in .env.
 * No domain names are hardcoded here. See platformDomain.js for details.
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
