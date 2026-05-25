const rateLimit = require('express-rate-limit');
const SystemConfig = require('../models/SystemConfig');
const { getRealIp } = require('../utils/ip');

// Unified global rate limiter instance (reused across all requests)
const globalLimiterInstance = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes window
    // Dynamic maxRequests fetched from DB cache on every validation
    max: async (req) => {
        try {
            const config = await SystemConfig.getCachedConfig();
            return config?.settings?.rateLimit?.maxRequests || 1000;
        } catch (err) {
            console.error("[RATE LIMITER ERROR] Failed to fetch dynamic max requests:", err);
            return 1000; // Safe default fallback
        }
    },
    // Prevent proxy bypass / blocking proxies instead of clients
    keyGenerator: (req) => {
        return getRealIp(req);
    },
    // Prevent legimate Meta webhook push traffic from getting rate-limited
    skip: (req) => {
        return req.originalUrl?.startsWith('/api/webhook') || req.path?.startsWith('/webhook');
    },
    message: { error: 'Too many requests from this IP, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

const globalLimiter = (req, res, next) => {
    return globalLimiterInstance(req, res, next);
};

// Strict auth limiter for brute-force protection (login, register, forgot-password)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // Limit each IP to 20 auth requests per window
    keyGenerator: (req) => {
        return getRealIp(req);
    },
    message: { error: 'Too many login attempts from this IP, please try again after 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
});

module.exports = {
    globalLimiter,
    authLimiter
};
