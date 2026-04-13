/**
 * apiRateLimiter.js
 *
 * Per-API-key rate limiter for the /api/v1/* gateway routes.
 *
 * Strategy: Sliding Window using in-memory store (suitable for single-instance).
 * Each API key gets an independent bucket. Unlike express-rate-limit which is
 * IP-based, this scopes limits to the authenticated key — preventing bypass via proxies.
 *
 * Limits (per key):
 *   - 10 requests/second burst max
 *   - 300 requests/minute sustained max
 *
 * Returns standard rate-limit headers on every response:
 *   X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
 */

const WINDOW_MS = 60 * 1000; // 1 minute window
const MAX_PER_WINDOW = 300;  // 300 requests per minute
const BURST_WINDOW_MS = 1000; // 1 second burst window
const MAX_BURST = 10;          // max 10 requests per second

// In-memory store: Map<keyId, { minuteWindow: [{ts}], burstWindow: [{ts}] }>
const keyStore = new Map();

// Cleanup stale entries every 5 minutes to prevent memory leak
setInterval(() => {
    const now = Date.now();
    for (const [keyId, data] of keyStore.entries()) {
        const hasRecentRequests = data.minuteWindow.some(ts => now - ts < WINDOW_MS);
        if (!hasRecentRequests) {
            keyStore.delete(keyId);
        }
    }
}, 5 * 60 * 1000);

module.exports = function apiRateLimiter(req, res, next) {
    // Only applies after apiAuth has resolved — req.apiKey.id must exist
    const keyId = req.apiKey?.id;
    if (!keyId) return next(); // Safety: let apiAuth handle missing key errors

    const now = Date.now();

    if (!keyStore.has(keyId)) {
        keyStore.set(keyId, { minuteWindow: [], burstWindow: [] });
    }

    const data = keyStore.get(keyId);

    // Prune old timestamps outside windows
    data.minuteWindow = data.minuteWindow.filter(ts => now - ts < WINDOW_MS);
    data.burstWindow = data.burstWindow.filter(ts => now - ts < BURST_WINDOW_MS);

    // Set standard rate-limit headers
    const remaining = Math.max(0, MAX_PER_WINDOW - data.minuteWindow.length - 1);
    const resetAt = Math.ceil((now + WINDOW_MS) / 1000); // Unix timestamp

    res.set('X-RateLimit-Limit', MAX_PER_WINDOW);
    res.set('X-RateLimit-Remaining', remaining);
    res.set('X-RateLimit-Reset', resetAt);

    // Check burst limit (per second)
    if (data.burstWindow.length >= MAX_BURST) {
        res.set('Retry-After', '1');
        return res.status(429).json({
            error: 'Too many requests. You have exceeded the burst limit of 10 requests/second.',
            code: 'RATE_LIMITED_BURST',
            retryAfter: 1
        });
    }

    // Check sustained limit (per minute)
    if (data.minuteWindow.length >= MAX_PER_WINDOW) {
        const oldestTs = data.minuteWindow[0];
        const retryAfterMs = Math.ceil((oldestTs + WINDOW_MS - now) / 1000);
        res.set('Retry-After', retryAfterMs);
        return res.status(429).json({
            error: `Too many requests. You have exceeded the limit of ${MAX_PER_WINDOW} requests/minute.`,
            code: 'RATE_LIMITED',
            retryAfter: retryAfterMs,
            resetAt
        });
    }

    // Record this request
    data.minuteWindow.push(now);
    data.burstWindow.push(now);

    next();
};
