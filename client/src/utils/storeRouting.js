/**
 * Determines the correct URL routing for the store.
 * If accessed via a Custom Domain, it strips the `/store/:slug` prefix
 * to keep the URL clean (e.g. `www.domain.com/product/123`).
 * If accessed via the platform domain, it keeps the prefix.
 */
export function getStoreRoute(slug, path = '') {
    const hostname = window.location.hostname;
    
    // Check if we are on a custom domain or platform domain
    // Add any staging/testing domains here if needed
    const isPlatform = 
        hostname === 'localhost' || 
        hostname === '127.0.0.1' || 
        hostname.includes('bluetick.cloud') || 
        hostname.includes('whatsapp-cloud.com') || 
        hostname.includes('ngrok.io') ||
        hostname.includes('railway.app');
    
    // Ensure path starts with a slash if provided
    const normalizedPath = path && !path.startsWith('/') && !path.startsWith('?') ? `/${path}` : path;
    
    if (isPlatform) {
        return `/store/${slug}${normalizedPath}`;
    } else {
        return normalizedPath || '/';
    }
}
