/**
 * OTP Store — In-Memory
 *
 * Holds pending OTP state per phone number. No DB table needed — OTPs are
 * ephemeral (≤10 min) and don't survive server restarts by design.
 *
 * Map key   : normalized phone number (digits only, with country code)
 * Map value : { otpHash, expiresAt, attempts, lastSentAt, hourlySends, hourWindowStart }
 */

const crypto = require('crypto');

// OTP_STORE: Map<phone, OtpEntry>
const OTP_STORE = new Map();

/**
 * Normalize phone to digits-only string (e.g. "+91 98765 43210" → "919876543210")
 */
const normalizePhone = (phone) => String(phone).replace(/\D/g, '');

/**
 * Generate a cryptographically secure 6-digit OTP.
 */
const generateOtp = () => {
    // randomInt(min, max) — upper bound exclusive, so 999999+1 = 1000000
    const otp = crypto.randomInt(100000, 1000000).toString();
    return otp;
};

/**
 * Hash the OTP before storing — never store plain OTP in memory.
 * Uses SHA-256 (fast, sufficient for short-lived tokens).
 */
const hashOtp = (otp) =>
    crypto.createHash('sha256').update(otp).digest('hex');

/**
 * Constant-time comparison to prevent timing attacks.
 */
const safeCompare = (a, b) => {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
};

/**
 * Check send rate limits for a phone number.
 *
 * @param {string} phone - normalized phone
 * @param {object} otpConfig - { resendCooldownSec, maxResendPerHour }
 * @returns {{ allowed: boolean, reason: string, retryAfterSec: number }}
 */
const checkSendLimits = (phone, otpConfig) => {
    const entry = OTP_STORE.get(phone);
    const now = Date.now();

    const cooldownMs = (otpConfig.resendCooldownSec || 60) * 1000;
    const maxPerHour = otpConfig.maxResendPerHour || 3;
    const hourMs = 60 * 60 * 1000;

    if (entry) {
        // Cooldown check
        if (entry.lastSentAt && now - entry.lastSentAt < cooldownMs) {
            const retryAfterSec = Math.ceil((cooldownMs - (now - entry.lastSentAt)) / 1000);
            return {
                allowed: false,
                reason: `Please wait ${retryAfterSec} seconds before requesting another code.`,
                retryAfterSec
            };
        }

        // Hourly cap check — reset if window has passed
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
 * Returns the plain OTP (used once, for sending — never stored).
 *
 * @param {string} phone
 * @param {object} otpConfig - { otpExpirySec, resendCooldownSec, maxResendPerHour }
 * @returns {string} plain OTP
 */
const createOtp = (phone, otpConfig) => {
    const otp = generateOtp();
    const now = Date.now();
    const existing = OTP_STORE.get(phone) || {};

    // Reset hourly window if it has expired
    const hourMs = 60 * 60 * 1000;
    const windowStart = existing.hourWindowStart && now - existing.hourWindowStart < hourMs
        ? existing.hourWindowStart
        : now;
    const hourlySends = existing.hourWindowStart && now - existing.hourWindowStart < hourMs
        ? (existing.hourlySends || 0) + 1
        : 1;

    OTP_STORE.set(phone, {
        otpHash: hashOtp(otp),
        expiresAt: now + (otpConfig.otpExpirySec || 300) * 1000,
        attempts: 0,
        lastSentAt: now,
        hourlySends,
        hourWindowStart: windowStart
    });

    return otp;
};

/**
 * Verify an OTP attempt for a phone number.
 *
 * @param {string} phone
 * @param {string} otp - plain OTP entered by user
 * @param {object} otpConfig - { maxVerifyAttempts }
 * @returns {{ valid: boolean, reason?: string }}
 */
const verifyOtp = (phone, otp, otpConfig) => {
    const entry = OTP_STORE.get(phone);
    const now = Date.now();
    const maxAttempts = otpConfig.maxVerifyAttempts || 5;

    if (!entry) {
        return { valid: false, reason: 'No verification code was requested for this number. Please request a new code.' };
    }

    if (now > entry.expiresAt) {
        OTP_STORE.delete(phone);
        return { valid: false, reason: 'Verification code has expired. Please request a new one.' };
    }

    if (entry.attempts >= maxAttempts) {
        OTP_STORE.delete(phone);
        return { valid: false, reason: 'Too many incorrect attempts. Please request a new verification code.' };
    }

    const inputHash = hashOtp(String(otp).trim());
    const isMatch = safeCompare(inputHash, entry.otpHash);

    if (!isMatch) {
        entry.attempts += 1;
        const remaining = maxAttempts - entry.attempts;
        if (remaining <= 0) {
            OTP_STORE.delete(phone);
            return { valid: false, reason: 'Too many incorrect attempts. Please request a new verification code.' };
        }
        return { valid: false, reason: `Incorrect code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.` };
    }

    // Correct — consume the OTP immediately (one-use)
    OTP_STORE.delete(phone);
    return { valid: true };
};

/**
 * Periodic cleanup — remove expired entries to prevent memory leaks.
 * Runs every 5 minutes.
 */
setInterval(() => {
    const now = Date.now();
    for (const [phone, entry] of OTP_STORE.entries()) {
        if (now > entry.expiresAt) {
            OTP_STORE.delete(phone);
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
