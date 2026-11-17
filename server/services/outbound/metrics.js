/**
 * The ONLY definitions of message numbers. Dashboard, Reports, campaign pages, superadmin and the
 * usage page all call these, so every screen shows the same figures.
 *
 *   attempted = sent + failed                (everything that was tried; excludes blocked/queued)
 *   sent      = accepted by Meta             (sent, delivered, read, clicked)
 *   delivered = delivered, read or clicked
 *   read      = read or clicked              (includes reads inferred from a reply or button click)
 *   failed    = rejected by Meta, at send time or later
 *   pending   = accepted, no delivery report yet
 *   retrying  = campaign retry scheduled (frequency cap)
 *   blocked   = not sent because the plan limit was reached
 *
 *   delivery rate = delivered / attempted, read rate = read / delivered, failed rate = failed / attempted
 *
 * A message belongs to the period in which it was sent (createdAt), counted in the account's time zone.
 * Rows from Bluetick's own number (platform) and messages sent outside Bluetick (external) are
 * excluded unless asked for.
 */
const { QueryTypes } = require('sequelize');
const { sequelize } = require('../../config/database');
const { partsIn, dayKey, addDays, zonedToUtc } = require('./time');
const { groupFor, SOURCES } = require('./sources');

const COUNT_COLUMNS = `
    COUNT(*) FILTER (WHERE status IN ('sent','delivered','read','clicked','failed'))::int AS attempted,
    COUNT(*) FILTER (WHERE status IN ('sent','delivered','read','clicked'))::int          AS sent,
    COUNT(*) FILTER (WHERE status IN ('delivered','read','clicked'))::int                 AS delivered,
    COUNT(*) FILTER (WHERE status IN ('read','clicked'))::int                             AS read,
    COUNT(*) FILTER (WHERE status = 'clicked')::int                                       AS clicked,
    COUNT(*) FILTER (WHERE status = 'failed')::int                                        AS failed,
    COUNT(*) FILTER (WHERE status = 'sent')::int                                          AS pending,
    COUNT(*) FILTER (WHERE status = 'retry_pending')::int                                 AS retrying,
    COUNT(*) FILTER (WHERE status = 'blocked')::int                                       AS blocked`;

const EMPTY = { attempted: 0, sent: 0, delivered: 0, read: 0, clicked: 0, failed: 0, pending: 0, retrying: 0, blocked: 0 };

const pct = (num, den) => (den > 0 ? ((num / den) * 100).toFixed(1) : '0.0');

function withRates(c) {
    return {
        ...c,
        deliveryRate: pct(c.delivered, c.attempted),
        readRate: pct(c.read, c.delivered),
        failedRate: pct(c.failed, c.attempted)
    };
}

// Build the WHERE clause shared by every query
function buildWhere({ ownerId, start, end, campaignId, campaignIds, sources, includePlatform = false, includeExternal = false }) {
    const parts = ['"deletedAt" IS NULL'];
    const rep = {};
    if (ownerId) { parts.push('"ownerId" = :ownerId'); rep.ownerId = ownerId; }
    if (campaignId) { parts.push('"campaignId" = :campaignId'); rep.campaignId = campaignId; }
    if (campaignIds) { parts.push('"campaignId" IN (:campaignIds)'); rep.campaignIds = campaignIds.length ? campaignIds : ['00000000-0000-0000-0000-000000000000']; }
    if (start) { parts.push('"createdAt" >= :start'); rep.start = start; }
    if (end) { parts.push('"createdAt" < :end'); rep.end = end; }
    if (sources?.length) { parts.push('source IN (:sources)'); rep.sources = sources; }
    if (!includePlatform) parts.push('platform = false');
    if (!includeExternal) parts.push(`source <> 'external'`);
    return { sql: parts.join(' AND '), rep };
}

async function summary(filter) {
    const { sql, rep } = buildWhere(filter);
    const [row] = await sequelize.query(`SELECT ${COUNT_COLUMNS} FROM "OutboundMessages" WHERE ${sql}`,
        { replacements: rep, type: QueryTypes.SELECT });
    return withRates({ ...EMPTY, ...(row || {}) });
}

// Per-campaign counts: { [campaignId]: summary }
async function byCampaign(campaignIds) {
    if (!campaignIds?.length) return {};
    const { sql, rep } = buildWhere({ campaignIds, includePlatform: true });
    const rows = await sequelize.query(
        `SELECT "campaignId", ${COUNT_COLUMNS} FROM "OutboundMessages" WHERE ${sql} GROUP BY "campaignId"`,
        { replacements: rep, type: QueryTypes.SELECT });
    const out = {};
    for (const id of campaignIds) out[id] = withRates({ ...EMPTY });
    for (const r of rows) { const { campaignId, ...c } = r; out[campaignId] = withRates({ ...EMPTY, ...c }); }
    return out;
}

// Sent messages per hour of day (0-23) in the account's time zone
async function hourly(filter, tz) {
    const { sql, rep } = buildWhere(filter);
    const rows = await sequelize.query(`
        SELECT EXTRACT(HOUR FROM ("createdAt" AT TIME ZONE :tz))::int AS hour, COUNT(*)::int AS count
          FROM "OutboundMessages"
         WHERE ${sql} AND status IN ('sent','delivered','read','clicked')
         GROUP BY 1`, { replacements: { ...rep, tz }, type: QueryTypes.SELECT });
    const map = Object.fromEntries(rows.map(r => [r.hour, r.count]));
    return Array.from({ length: 24 }, (_, i) => ({ hour: i, count: map[i] || 0 }));
}

/**
 * Time series between start and end, by 'day' or 'hour' in tz. Every bucket is present (zero-filled).
 * Each point: { name, date, fullDate, messages (sent), delivered, read, failed }
 */
async function series(filter, tz, unit = 'day') {
    const { sql, rep } = buildWhere(filter);
    const fmt = unit === 'hour' ? 'YYYY-MM-DD HH24' : 'YYYY-MM-DD';
    const rows = await sequelize.query(`
        SELECT to_char("createdAt" AT TIME ZONE :tz, :fmt) AS bucket, ${COUNT_COLUMNS}
          FROM "OutboundMessages" WHERE ${sql} GROUP BY 1`,
        { replacements: { ...rep, tz, fmt }, type: QueryTypes.SELECT });
    const map = Object.fromEntries(rows.map(r => [r.bucket, r]));

    const out = [];
    const pad = (n) => String(n).padStart(2, '0');
    if (unit === 'hour') {
        // Step one hour at a time from the start of the first local hour (works for half-hour zones like IST)
        const sp = partsIn(filter.start, tz);
        let t = zonedToUtc(sp.y, sp.m, sp.d, sp.h, 0, tz);
        let guard = 0;
        while (t < filter.end && guard++ < 24 * 40) {
            const p = partsIn(t, tz);
            const key = `${p.y}-${pad(p.m)}-${pad(p.d)} ${pad(p.h)}`;
            const r = map[key] || EMPTY;
            const h12 = p.h % 12 === 0 ? 12 : p.h % 12;
            out.push({ name: `${h12} ${p.h < 12 ? 'AM' : 'PM'}`, date: key, fullDate: t.toISOString(),
                messages: r.sent || 0, delivered: r.delivered || 0, read: r.read || 0, failed: r.failed || 0 });
            t = new Date(t.getTime() + 3600000);
        }
    } else {
        let t = filter.start;
        let guard = 0;
        const seen = new Set();
        while (t < filter.end && guard++ < 400) {
            const key = dayKey(t, tz);
            if (!seen.has(key)) {
                seen.add(key);
                const r = map[key] || EMPTY;
                const [y, m, d] = key.split('-').map(Number);
                const name = new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
                out.push({ name, date: key, fullDate: `${key}T00:00:00`,
                    messages: r.sent || 0, delivered: r.delivered || 0, read: r.read || 0, failed: r.failed || 0 });
            }
            t = addDays(t, 1, tz);
        }
    }
    return out;
}

// Failure reasons with count and share
async function failedReasons(filter) {
    const { sql, rep } = buildWhere(filter);
    const rows = await sequelize.query(`
        SELECT COALESCE("errorReason", 'Unknown error') AS reason, COUNT(*)::int AS count
          FROM "OutboundMessages" WHERE ${sql} AND status = 'failed'
         GROUP BY 1 ORDER BY 2 DESC`, { replacements: rep, type: QueryTypes.SELECT });
    const total = rows.reduce((s, r) => s + r.count, 0);
    return { total, breakdown: rows.map(r => ({ reason: r.reason, count: r.count, pct: pct(r.count, total) })) };
}

// Delivered messages per feature group (usage page), with how many Meta marked billable
async function byFeature(filter) {
    const { sql, rep } = buildWhere({ ...filter, includeExternal: true });
    const rows = await sequelize.query(`
        SELECT source, COUNT(*)::int AS delivered, COUNT(*) FILTER (WHERE billable = true)::int AS paid
          FROM "OutboundMessages" WHERE ${sql} AND status IN ('delivered','read','clicked')
         GROUP BY source`, { replacements: rep, type: QueryTypes.SELECT });
    const groups = new Map();
    let total = 0;
    for (const r of rows) {
        const g = groupFor(SOURCES[r.source] ? r.source : 'external');
        const f = groups.get(g.key) || { key: g.key, label: g.label, delivered: 0, paid: 0 };
        f.delivered += r.delivered; f.paid += r.paid; total += r.delivered;
        groups.set(g.key, f);
    }
    return { byFeature: [...groups.values()].sort((a, b) => b.delivered - a.delivered), loggedDelivered: total };
}

// Messages sent from Bluetick's own number, per kind (superadmin: what Bluetick pays Meta for)
async function platformBySource(filter) {
    const { sql, rep } = buildWhere({ ...filter, includePlatform: true });
    const rows = await sequelize.query(`
        SELECT source, ${COUNT_COLUMNS}, COUNT(*) FILTER (WHERE billable = true)::int AS billable
          FROM "OutboundMessages" WHERE ${sql} AND platform = true
         GROUP BY source ORDER BY 2 DESC`, { replacements: rep, type: QueryTypes.SELECT });
    const bySource = rows.map(r => ({ source: r.source, label: SOURCES[r.source]?.label || r.source,
        sent: r.sent, delivered: r.delivered, failed: r.failed, billable: r.billable }));
    const total = bySource.reduce((t, r) => ({ sent: t.sent + r.sent, delivered: t.delivered + r.delivered, failed: t.failed + r.failed, billable: t.billable + r.billable }),
        { sent: 0, delivered: 0, failed: 0, billable: 0 });
    return { total, bySource };
}

// Daily volume across all accounts (superadmin graph), zero-filled
async function dailyVolume(filter, tz) {
    return (await series(filter, tz, 'day')).map(p => ({ date: p.date, count: p.messages + p.failed }));
}

module.exports = { summary, byCampaign, hourly, series, failedReasons, byFeature, platformBySource, dailyVolume, withRates, EMPTY };
