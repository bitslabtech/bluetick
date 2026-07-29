const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis').default;
const Redis = require('ioredis');
const SystemConfig = require('../models/SystemConfig');
const { getRealIp } = require('../utils/ip');

// Initialize Redis if REDIS_URL is provided
let redisClient = null;
if (process.env.REDIS_URL) {
    redisClient = new Redis(process.env.REDIS_URL, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
            if (times > 3) return null; // stop retrying, fall back
            return Math.min(times * 50, 2000);
        }
    });
    redisClient.on('error', (err) => {
        console.error('[RATE LIMITER] Redis error (using graceful fallback):', err.message);
    });
    redisClient.on('connect', () => {
        console.log('[RATE LIMITER] Connected to Redis.');
    });
} else {
    console.warn('[RATE LIMITER] REDIS_URL not set. Falling back to in-memory store.');
}

const getStore = () => {
    if (redisClient && redisClient.status === 'ready') {
        return new RedisStore({
            sendCommand: (...args) => redisClient.call(...args),
        });
    }
    // Fall back to memory store if Redis is unavailable or disconnected
    return undefined; 
};

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
    store: getStore(),
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
    // We dynamically apply the store to allow fallback if Redis disconnects mid-flight
    // Note: express-rate-limit handles dynamic store injection if needed, but it's
    // safer to rely on the instance creation for the fallback logic.
    return globalLimiterInstance(req, res, next);
};

// Strict auth limiter for brute-force protection (login, register, forgot-password)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // Limit each IP to 20 auth requests per window
    store: getStore(),
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
