// Plan message allowance: atomic reserve / release on the OutboundUsage counter.
// Reserving and checking happen in one UPDATE, so parallel sends can never go over the limit.
const { QueryTypes } = require('sequelize');
const { sequelize } = require('../../config/database');
const { getAccountTimezone, periodKey } = require('./time');

const limitCache = new Map(); // ownerId -> { limit, at }

async function getMessageLimit(ownerId) {
    const hit = limitCache.get(ownerId);
    if (hit && Date.now() - hit.at < 30 * 1000) return hit.limit;
    const { getUserPlanLimits } = require('../../utils/planLimits');
    let limit = 0;
    try { limit = (await getUserPlanLimits(ownerId)).messageLimit; } catch { limit = 0; }
    limitCache.set(ownerId, { limit, at: Date.now() });
    return limit;
}

function clearLimitCache(ownerId) { ownerId ? limitCache.delete(ownerId) : limitCache.clear(); }

// Create the counter row for a period, seeded from the ledger (so a new month row, or one rebuilt
// after a restart, starts from the true count).
async function ensureRow(ownerId, period) {
    await sequelize.query(`
        INSERT INTO "OutboundUsages" ("id", "ownerId", "period", "used", "createdAt", "updatedAt")
        SELECT md5(random()::text || clock_timestamp()::text)::uuid, :ownerId, :period,
               (SELECT COUNT(*) FROM "OutboundMessages"
                 WHERE "ownerId" = :ownerId AND "periodKey" = :period AND "counted" = true),
               NOW(), NOW()
        ON CONFLICT ("ownerId", "period") DO NOTHING`,
        { replacements: { ownerId, period }, type: QueryTypes.INSERT });
}

/**
 * Take one unit of allowance. Returns { ok, period, used, limit }.
 * limit -1 = unlimited (still counted so usage is visible).
 */
async function reserve(ownerId, at = new Date()) {
    const tz = await getAccountTimezone(ownerId);
    const period = periodKey(at, tz);
    const limit = await getMessageLimit(ownerId);
    await ensureRow(ownerId, period);
    const rows = await sequelize.query(`
        UPDATE "OutboundUsages" SET "used" = "used" + 1, "updatedAt" = NOW()
         WHERE "ownerId" = :ownerId AND "period" = :period AND (:limit < 0 OR "used" < :limit)
        RETURNING "used"`,
        { replacements: { ownerId, period, limit }, type: QueryTypes.SELECT });
    if (!rows.length) {
        const [cur] = await sequelize.query(`SELECT "used" FROM "OutboundUsages" WHERE "ownerId" = :ownerId AND "period" = :period`,
            { replacements: { ownerId, period }, type: QueryTypes.SELECT });
        return { ok: false, period, used: cur?.used ?? 0, limit };
    }
    return { ok: true, period, used: rows[0].used, limit };
}

async function release(ownerId, period) {
    if (!ownerId || !period) return;
    await sequelize.query(`
        UPDATE "OutboundUsages" SET "used" = GREATEST("used" - 1, 0), "updatedAt" = NOW()
         WHERE "ownerId" = :ownerId AND "period" = :period`,
        { replacements: { ownerId, period } });
}

// Messages used this month (owner's time zone)
async function getUsed(ownerId, at = new Date()) {
    const tz = await getAccountTimezone(ownerId);
    const period = periodKey(at, tz);
    await ensureRow(ownerId, period);
    const [row] = await sequelize.query(`SELECT "used" FROM "OutboundUsages" WHERE "ownerId" = :ownerId AND "period" = :period`,
        { replacements: { ownerId, period }, type: QueryTypes.SELECT });
    return row?.used ?? 0;
}

// Does the owner have room for `count` more messages right now? (pre-check for bulk sends; the
// per-message reserve() is still what enforces the limit)
async function hasRoom(ownerId, count = 1) {
    const limit = await getMessageLimit(ownerId);
    if (limit < 0) return { ok: true, used: await getUsed(ownerId), limit, remaining: Infinity };
    const used = await getUsed(ownerId);
    return { ok: used + count <= limit, used, limit, remaining: Math.max(0, limit - used) };
}

// Rebuild counters from the ledger (daily reconciliation and after backfill)
async function recountAll(period = null) {
    const where = period ? `AND "periodKey" = :period` : '';
    await sequelize.query(`
        INSERT INTO "OutboundUsages" ("id", "ownerId", "period", "used", "createdAt", "updatedAt")
        SELECT md5(random()::text || clock_timestamp()::text)::uuid, "ownerId", "periodKey", COUNT(*), NOW(), NOW()
          FROM "OutboundMessages"
         WHERE "counted" = true AND "periodKey" IS NOT NULL ${where}
         GROUP BY "ownerId", "periodKey"
        ON CONFLICT ("ownerId", "period") DO UPDATE SET "used" = EXCLUDED."used", "updatedAt" = NOW()`,
        { replacements: { period } });
    // Periods with no counted rows left
    await sequelize.query(`
        UPDATE "OutboundUsages" u SET "used" = 0, "updatedAt" = NOW()
         WHERE ${period ? `u."period" = :period AND` : ''} NOT EXISTS (
            SELECT 1 FROM "OutboundMessages" m WHERE m."ownerId" = u."ownerId" AND m."periodKey" = u."period"
               AND m."counted" = true)`,
        { replacements: { period } });
}

module.exports = { reserve, release, getUsed, hasRoom, getMessageLimit, clearLimitCache, recountAll };
