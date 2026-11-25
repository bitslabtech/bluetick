/**
 * Runs on server start: encrypts any WhatsApp / Meta access tokens still stored as plain text,
 * so turning on TOKEN_ENCRYPTION_KEY needs only "set the key and redeploy".
 *
 * - Does nothing without TOKEN_ENCRYPTION_KEY.
 * - Idempotent: rows already encrypted ("enc:v1:...") are never selected, so later restarts are no-ops.
 * - Each value must decrypt back to the original before it is written, and the UPDATE only
 *   applies if the row still holds that same plain value (no race with a save in progress).
 * - Never throws: a failure is logged and the server keeps running with the plain token.
 */
const { encryptSecret, decryptSecret, isEncryptedSecret, PREFIX } = require('../utils/secretBox');

const tableOf = (model) => { const t = model.getTableName(); return typeof t === 'string' ? t : t.tableName; };

async function encryptStoredTokens({ sequelize, models } = {}) {
    const key = process.env.TOKEN_ENCRYPTION_KEY;
    if (!key || key.trim().length < 16) return { skipped: true, encrypted: 0 };

    const db = sequelize || require('../config/database').sequelize;
    const columns = [
        { table: tableOf(models?.Settings || require('../models/Settings')), column: 'metaAccessToken' },
        { table: tableOf(models?.User || require('../models/User')), column: 'fbAccessToken' },
    ];

    let encrypted = 0;
    let failed = 0;
    for (const { table, column } of columns) {
        try {
            const rows = await db.query(
                `SELECT id, "${column}" AS v FROM "${table}" WHERE "${column}" IS NOT NULL AND "${column}" <> '' AND "${column}" NOT LIKE :prefix`,
                { replacements: { prefix: `${PREFIX}%` }, type: db.QueryTypes.SELECT },
            );
            for (const { id, v } of rows) {
                const next = encryptSecret(v);
                if (!isEncryptedSecret(next) || decryptSecret(next) !== v) { failed += 1; continue; }
                await db.query(
                    `UPDATE "${table}" SET "${column}" = :next WHERE id = :id AND "${column}" = :v`,
                    { replacements: { next, id, v } },
                );
                encrypted += 1;
            }
        } catch (e) {
            failed += 1;
            console.error(`[SECRETS] Could not encrypt stored tokens in ${table}.${column}:`, e.message);
        }
    }
    if (encrypted || failed) console.log(`[SECRETS] Encrypted ${encrypted} stored access token(s)${failed ? `, ${failed} failed (left as plain text)` : ''}`);
    return { skipped: false, encrypted, failed };
}

module.exports = { encryptStoredTokens };
