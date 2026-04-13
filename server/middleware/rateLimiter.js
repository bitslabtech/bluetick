const rateLimit = require('express-rate-limit');
const SystemConfig = require('../models/SystemConfig');

// Dynamic global rate limiter that reads from cached DB config
const globalLimiter = async (req, res, next) => {
    try {
        const config = await SystemConfig.getCachedConfig();

        // Ensure defaults if properties are missing
        const windowMs = config?.settings?.rateLimit?.windowMs || 15 * 60 * 1000;
        const maxRequests = config?.settings?.rateLimit?.maxRequests || 1000;

        const limiter = rateLimit({
            windowMs: windowMs,
            max: maxRequests,
            message: { error: 'Too many requests from this IP, please try again later.' },
            standardHeaders: true,
            legacyHeaders: false,
        });

        return limiter(req, res, next);
    } catch (err) {
        console.error("Global Limiter Error:", err);
        next(); // Fallback to allowing request if DB cache fails
    }
};

// Strict auth limiter for brute force protection
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // Limit each IP to 20 auth requests per `window`
    message: { error: 'Too many login attempts from this IP, please try again after 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
});

module.exports = {
    globalLimiter,
    authLimiter
};
