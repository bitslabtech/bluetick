/**
 * cdnImage.js — Direct CDN utility (Proxy Disabled)
 *
 * Modified per user request to bypass the /api/img proxy
 * and serve images directly from the CDN to avoid any compression.
 */

export function cdnImg(url, options = {}) {
    return url;
}

export function cdnSrcSet(url, widths, options = {}) {
    // Return undefined to remove the srcSet attribute entirely,
    // forcing the browser to download the original, full-resolution image.
    return undefined;
}

