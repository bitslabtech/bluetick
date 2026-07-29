/**
 * OTP Store — Redis Backed with In-Memory Fallback
 *
 * Holds pending OTP state per phone number.
 */

const crypto = require('crypto');
const Redis = require('ioredis');

// Fallback in-memory map if Redis is not configured or fails
const MEMORY_STORE = new Map();

// Initialize Redis if REDIS_URL is provided
let redis = null;
if (process.env.REDIS_URL) {
    redis = new Redis(process.env.REDIS_URL, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
            if (times > 3) return null; // stop retrying, fall back
            return Math.min(times * 50, 2000);
        }
    });
    redis.on('error', (err) => {
        console.error('[OTP STORE] Redis connection error (using fallback):', err.message);
    });
    redis.on('connect', () => {
        console.log('[OTP STORE] Connected to Redis.');
    });
} else {
    console.warn('[OTP STORE] REDIS_URL not set. Falling back to in-memory store (not recommended for production).');
}

/**
 * Normalize phone to digits-only string (e.g. "+91 98765 43210" → "919876543210")
 */
const normalizePhone = (phone) => String(phone).replace(/\D/g, '');

const generateOtp = () => crypto.randomInt(100000, 1000000).toString();
const hashOtp = (otp) => crypto.createHash('sha256').update(otp).digest('hex');

const safeCompare = (a, b) => {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
};

/**
 * Helper to get an entry from Redis or Memory
 */
const getEntry = async (phone) => {
    if (redis && redis.status === 'ready') {
        const data = await redis.get(`otp:${phone}`);
        return data ? JSON.parse(data) : null;
    }
    return MEMORY_STORE.get(phone) || null;
};

/**
 * Helper to save an entry to Redis or Memory
 */
const setEntry = async (phone, entry, expirySec) => {
    if (redis && redis.status === 'ready') {
        // We set expiry matching the hour window or OTP expiry
        const ttl = Math.max(expirySec || 300, 3600); 
        await redis.set(`otp:${phone}`, JSON.stringify(entry), 'EX', ttl);
    } else {
        MEMORY_STORE.set(phone, entry);
    }
};

/**
 * Helper to delete an entry
 */
const deleteEntry = async (phone) => {
    if (redis && redis.status === 'ready') {
        await redis.del(`otp:${phone}`);
    } else {
        MEMORY_STORE.delete(phone);
    }
};

/**
 * Check send rate limits for a phone number.
 */
const checkSendLimits = async (phone, otpConfig) => {
    const entry = await getEntry(phone);
    const now = Date.now();

    const cooldownMs = (otpConfig.resendCooldownSec || 60) * 1000;
    const maxPerHour = otpConfig.maxResendPerHour || 3;
    const hourMs = 60 * 60 * 1000;

    if (entry) {
        if (entry.lastSentAt && now - entry.lastSentAt < cooldownMs) {
            const retryAfterSec = Math.ceil((cooldownMs - (now - entry.lastSentAt)) / 1000);
            return {
                allowed: false,
                reason: `Please wait ${retryAfterSec} seconds before requesting another code.`,
                retryAfterSec
            };
        }

        const windowStart = entry.hourWindowStart || now;
        const sendsInWindow = now - windowStart < hourMs ? (entry.hourlySends || 0) : 0;

        if (sendsInWindow >= maxPerHour) {
            const retryAfterSec = Math.ceil((hourMs - (now - windowStart)) / 1000);
            return {
                allowed: false,
                reason: `Too many verification codes requested. Please try again in ${Math.ceil(retryAfterSec / 60)} minute(s).`,
                retryAfterSec
            };
        }
    }

    return { allowed: true };
};

/**
 * Create or overwrite an OTP entry for a phone number.
 */
const createOtp = async (phone, otpConfig) => {
    const otp = generateOtp();
    const now = Date.now();
    const existing = await getEntry(phone) || {};

    const hourMs = 60 * 60 * 1000;
    const windowStart = existing.hourWindowStart && now - existing.hourWindowStart < hourMs
        ? existing.hourWindowStart
        : now;
    const hourlySends = existing.hourWindowStart && now - existing.hourWindowStart < hourMs
        ? (existing.hourlySends || 0) + 1
        : 1;

    const entry = {
        otpHash: hashOtp(otp),
        expiresAt: now + (otpConfig.otpExpirySec || 300) * 1000,
        attempts: 0,
        lastSentAt: now,
        hourlySends,
        hourWindowStart: windowStart
    };

    await setEntry(phone, entry, otpConfig.otpExpirySec || 300);

    return otp;
};

/**
 * Verify an OTP attempt for a phone number.
 */
const verifyOtp = async (phone, otp, otpConfig) => {
    const entry = await getEntry(phone);
    const now = Date.now();
    const maxAttempts = otpConfig.maxVerifyAttempts || 5;

    if (!entry) {
        return { valid: false, reason: 'No verification code was requested for this number. Please request a new code.' };
    }

    if (now > entry.expiresAt) {
        await deleteEntry(phone);
        return { valid: false, reason: 'Verification code has expired. Please request a new one.' };
    }

    if (entry.attempts >= maxAttempts) {
        await deleteEntry(phone);
        return { valid: false, reason: 'Too many incorrect attempts. Please request a new verification code.' };
    }

    const inputHash = hashOtp(String(otp).trim());
    const isMatch = safeCompare(inputHash, entry.otpHash);

    if (!isMatch) {
        entry.attempts += 1;
        const remaining = maxAttempts - entry.attempts;
        if (remaining <= 0) {
            await deleteEntry(phone);
            return { valid: false, reason: 'Too many incorrect attempts. Please request a new verification code.' };
        }
        await setEntry(phone, entry, Math.ceil((entry.expiresAt - now)/1000));
        return { valid: false, reason: `Incorrect code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.` };
    }

    await deleteEntry(phone);
    return { valid: true };
};

// Periodic cleanup for memory fallback
setInterval(() => {
    if (redis && redis.status === 'ready') return; // Redis handles its own TTL
    const now = Date.now();
    for (const [phone, entry] of MEMORY_STORE.entries()) {
        if (now > entry.expiresAt) {
            MEMORY_STORE.delete(phone);
        }
    }
}, 5 * 60 * 1000);

module.exports = {
    normalizePhone,
    generateOtp,
    checkSendLimits,
    createOtp,
    verifyOtp
};
