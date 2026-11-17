/**
 * Daily reconciliation.
 *  1. Rebuild every plan allowance counter for this month and last month from the ledger, so a
 *     crash between "reserve" and "save" can never leave a counter wrong for more than a day.
 *  2. For each account, compare Meta's delivered volume (pricing_analytics snapshot, WaUsageDaily)
 *     with the ledger's delivered count over the last 3 full days (UTC, as Meta reports). A gap means
 *     status webhooks were lost or something sent outside the gateway; it is written to the
 *     superadmin activity log.
 */
const { QueryTypes } = require('sequelize');
const { sequelize } = require('../../config/database');
const allowance = require('./allowance');

const GAP_MIN = 10;      // ignore tiny differences
const GAP_RATIO = 0.03;  // and anything under 3%

async function run() {
    // 1. Counters (all periods touched in the last ~2 months)
    const now = new Date();
    const thisPeriod = now.toISOString().slice(0, 7);
    const prev = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)).toISOString().slice(0, 7);
    await allowance.recountAll(thisPeriod);
    await allowance.recountAll(prev);

    // 2. Meta vs ledger, last 3 full UTC days
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const start = new Date(end.getTime() - 3 * 86400000);
    const fromDay = start.toISOString().slice(0, 10);
    const toDay = new Date(end.getTime() - 86400000).toISOString().slice(0, 10);

    const rows = await sequelize.query(`
        WITH meta AS (
            SELECT "userId" AS owner, SUM("volume")::int AS meta
              FROM "WaUsageDailies" WHERE "date" BETWEEN :fromDay AND :toDay GROUP BY 1
        ), ours AS (
            SELECT "ownerId" AS owner, COUNT(*)::int AS ours
              FROM "OutboundMessages"
             WHERE "deliveredAt" >= :start AND "deliveredAt" < :end AND "source" <> 'external'
             GROUP BY 1
        ), outside AS (
            SELECT "ownerId" AS owner, COUNT(*)::int AS outside
              FROM "OutboundMessages"
             WHERE "deliveredAt" >= :start AND "deliveredAt" < :end AND "source" = 'external'
             GROUP BY 1
        )
        SELECT meta.owner, meta.meta, COALESCE(ours.ours, 0) AS ours, COALESCE(outside.outside, 0) AS outside
          FROM meta LEFT JOIN ours ON ours.owner = meta.owner LEFT JOIN outside ON outside.owner = meta.owner`,
        { replacements: { fromDay, toDay, start, end }, type: QueryTypes.SELECT });

    const ActivityLog = require('../../models/ActivityLog');
    let flagged = 0;
    for (const r of rows) {
        const gap = r.meta - r.ours - r.outside;
        if (Math.abs(gap) < Math.max(GAP_MIN, r.meta * GAP_RATIO)) continue;
        flagged++;
        await ActivityLog.create({
            userId: r.owner,
            action: 'Message count gap',
            details: `${fromDay} to ${toDay}: Meta delivered ${r.meta}, Bluetick recorded ${r.ours} (+${r.outside} sent outside Bluetick). Gap ${gap}. ` +
                `Check the webhook URL for this account and the "WhatsApp Usage Check" tab.`
        }).catch(() => {});
    }
    console.log(`[OUTBOUND] Reconcile done: ${rows.length} accounts compared, ${flagged} flagged.`);
    return { compared: rows.length, flagged };
}

module.exports = { run };
