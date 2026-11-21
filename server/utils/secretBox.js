/**
 * Encryption at rest for stored secrets (WhatsApp / Meta access tokens).
 *
 * Format: "enc:v1:<iv>:<tag>:<ciphertext>" (base64 parts), AES-256-GCM, so tampering or a wrong
 * key is detected instead of returning garbage.
 *
 * Safe rollout:
 *  - Without TOKEN_ENCRYPTION_KEY nothing changes: values are stored and read as plain text.
 *  - With the key set, new and updated tokens are encrypted on save. Existing plain-text tokens
 *    keep working (they are read as-is) until scripts/encryptTokens.js converts them.
 *  - The key is separate from JWT_SECRET on purpose: rotating the JWT secret must never make
 *    every customer's WhatsApp connection unreadable. Never change or lose TOKEN_ENCRYPTION_KEY
 *    once tokens are encrypted with it (decrypt them first with the script's --decrypt).
 */
const crypto = require('crypto');

const PREFIX = 'enc:v1:';
let warnedNoKey = false;

function getKey() {
    const raw = process.env.TOKEN_ENCRYPTION_KEY;
    if (!raw || String(raw).trim().length < 16) return null;
    return crypto.createHash('sha256').update(String(raw).trim()).digest(); // 32 bytes
}

function isEncryptedSecret(value) {
    return typeof value === 'string' && value.startsWith(PREFIX);
}

/** Encrypt a secret for storage. Empty values, already-encrypted values and "no key" pass through. */
function encryptSecret(value) {
    if (value === null || value === undefined || value === '') return value;
    const text = String(value);
    if (isEncryptedSecret(text)) return text; // never double-encrypt
    const key = getKey();
    if (!key) {
        if (!warnedNoKey && process.env.NODE_ENV === 'production') {
            warnedNoKey = true;
            console.warn('[SECRETS] TOKEN_ENCRYPTION_KEY is not set: access tokens are stored unencrypted.');
        }
        return text;
    }
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const ct = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${PREFIX}${iv.toString('base64')}:${tag.toString('base64')}:${ct.toString('base64')}`;
}

/**
 * Decrypt a stored secret. Plain-text (legacy) values are returned as-is.
 * If it cannot be decrypted (missing or wrong key), the stored value is returned unchanged so a
 * later save never overwrites it, and the error is logged loudly.
 */
function decryptSecret(value) {
    if (!isEncryptedSecret(value)) return value;
    const key = getKey();
    if (!key) {
        console.error('[SECRETS] Found an encrypted token but TOKEN_ENCRYPTION_KEY is not set. WhatsApp calls will fail until it is restored.');
        return value;
    }
    try {
        const [iv, tag, ct] = value.slice(PREFIX.length).split(':').map((p) => Buffer.from(p, 'base64'));
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAuthTag(tag);
        return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8');
    } catch (e) {
        console.error('[SECRETS] Could not decrypt a stored token (wrong TOKEN_ENCRYPTION_KEY?):', e.message);
        return value;
    }
}

/** Sequelize attribute options that encrypt on save and decrypt on read. */
function encryptedAttribute(name) {
    return {
        get() { return decryptSecret(this.getDataValue(name)); },
        set(val) { this.setDataValue(name, encryptSecret(val)); },
    };
}

module.exports = { encryptSecret, decryptSecret, isEncryptedSecret, encryptedAttribute, PREFIX };
