/**
 * cdnImage.js — Simple passthrough (no paid CDN transform needed)
 *
 * Images are resized to the correct display dimensions at upload time
 * by Sharp inside storageProvider.js. The stored image IS the right size.
 *
 * This file is kept as a stub so imports in components don't break.
 * If Cloudflare Images plan is purchased in the future, replace this
 * with the /cdn-cgi/image/ implementation.
 */

export function cdnImg(url, _options = {}) {
    return url || '';
}

export function cdnSrcSet(url, _widths = [], _options = {}) {
    return '';
}
