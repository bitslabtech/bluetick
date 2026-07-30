const crypto = require('crypto');
require('dotenv').config();

const algorithm = 'aes-256-cbc';
// Derive a 32-byte key from ENCRYPTION_KEY or JWT_SECRET
const keyString = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || 'default-insecure-fallback-key-32!';
const key = crypto.createHash('sha256').update(String(keyString)).digest('base64').substring(0, 32);

function encrypt(text) {
    if (!text) return text;
    try {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(algorithm, Buffer.from(key), iv);
        let encrypted = cipher.update(text);
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        return iv.toString('hex') + ':' + encrypted.toString('hex');
    } catch (error) {
        console.error('[ENCRYPTION] Encrypt error:', error.message);
        return text;
    }
}

function decrypt(text) {
    if (!text) return text;
    if (!text.includes(':')) return text; // Probably already plain text (migration safe)
    
    try {
        const textParts = text.split(':');
        const iv = Buffer.from(textParts.shift(), 'hex');
        const encryptedText = Buffer.from(textParts.join(':'), 'hex');
        
        // If IV is invalid length, it might be a weird plain text string
        if (iv.length !== 16) return text;

        const decipher = crypto.createDecipheriv(algorithm, Buffer.from(key), iv);
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString();
    } catch (error) {
        console.error('[ENCRYPTION] Decrypt error:', error.message);
        // Fallback to plain text in case it wasn't encrypted but happened to contain a colon
        return text;
    }
}

module.exports = { encrypt, decrypt };
