// Account time zone helpers. Days and months in reports and the plan limit are counted in the
// owner's time zone (User.timezone, default Asia/Kolkata).
const DEFAULT_TZ = 'Asia/Kolkata';
const tzCache = new Map(); // ownerId -> { tz, at }

function validTz(tz) {
    try { Intl.DateTimeFormat('en-US', { timeZone: tz }); return true; } catch { return false; }
}

async function getAccountTimezone(ownerId) {
    if (!ownerId) return DEFAULT_TZ;
    const hit = tzCache.get(ownerId);
    if (hit && Date.now() - hit.at < 5 * 60 * 1000) return hit.tz;
    const User = require('../../models/User');
    const u = await User.findByPk(ownerId, { attributes: ['id', 'timezone'] });
    const tz = u?.timezone && validTz(u.timezone) ? u.timezone : DEFAULT_TZ;
    tzCache.set(ownerId, { tz, at: Date.now() });
    return tz;
}

function clearTimezoneCache(ownerId) { tzCache.delete(ownerId); }

// Wall-clock parts of `date` in time zone `tz`
function partsIn(date, tz) {
    const f = new Intl.DateTimeFormat('en-CA', {
        timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
    });
    const p = Object.fromEntries(f.formatToParts(date).map(x => [x.type, x.value]));
    return { y: +p.year, m: +p.month, d: +p.day, h: +p.hour, mi: +p.minute, s: +p.second };
}

// Offset (ms) of tz from UTC at instant `date`
function offsetMs(date, tz) {
    const p = partsIn(date, tz);
    return Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi, p.s) - Math.floor(date.getTime() / 1000) * 1000;
}

// The UTC instant of wall-clock time y-m-d h:mi in tz
function zonedToUtc(y, m, d, h = 0, mi = 0, tz) {
    const guess = Date.UTC(y, m - 1, d, h, mi);
    let ts = guess - offsetMs(new Date(guess), tz);
    ts = guess - offsetMs(new Date(ts), tz); // second pass handles DST edges
    return new Date(ts);
}

const pad = (n) => String(n).padStart(2, '0');

function periodKey(date, tz) {
    const p = partsIn(date, tz);
    return `${p.y}-${pad(p.m)}`;
}

function dayKey(date, tz) {
    const p = partsIn(date, tz);
    return `${p.y}-${pad(p.m)}-${pad(p.d)}`;
}

function startOfDay(date, tz) {
    const p = partsIn(date, tz);
    return zonedToUtc(p.y, p.m, p.d, 0, 0, tz);
}

function startOfMonth(date, tz) {
    const p = partsIn(date, tz);
    return zonedToUtc(p.y, p.m, 1, 0, 0, tz);
}

// 'YYYY-MM-DD' (or an ISO string, whose calendar date in tz is used) -> start of that day in tz
function parseDay(str, tz) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(str || ''));
    if (m) return zonedToUtc(+m[1], +m[2], +m[3], 0, 0, tz);
    const d = new Date(str);
    return isNaN(d) ? null : startOfDay(d, tz);
}

function addDays(date, n, tz) {
    const p = partsIn(date, tz);
    return zonedToUtc(p.y, p.m, p.d + n, p.h, p.mi, tz);
}

function addMonthsClamped(date, n, tz) {
    const p = partsIn(date, tz);
    const target = new Date(Date.UTC(p.y, p.m - 1 + n, 1));
    const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
    return zonedToUtc(target.getUTCFullYear(), target.getUTCMonth() + 1, Math.min(p.d, lastDay), p.h, p.mi, tz);
}

/**
 * Resolve a report range to [start, end) instants in the account's time zone.
 * range: 1d | 7d | 30d | 1m | 3m | this_month | custom (startDate/endDate as YYYY-MM-DD or ISO)
 */
function resolveRange(range, startDate, endDate, tz, now = new Date()) {
    const today = startOfDay(now, tz);
    let start;
    let end = now;
    switch (range) {
        case '1d': start = today; break;
        case '7d': start = addDays(today, -6, tz); break;   // today + previous 6 days
        case '30d': start = addDays(today, -29, tz); break;
        case '1m': start = addMonthsClamped(today, -1, tz); break;
        case '3m': start = addMonthsClamped(today, -3, tz); break;
        case 'custom': {
            start = parseDay(startDate, tz) || addDays(today, -29, tz);
            const endDay = parseDay(endDate, tz);
            end = endDay ? addDays(endDay, 1, tz) : now;
            break;
        }
        case 'this_month':
        default:
            start = startOfMonth(now, tz);
    }
    if (end > now && range !== 'custom') end = now;
    return { start, end };
}

module.exports = {
    DEFAULT_TZ, getAccountTimezone, clearTimezoneCache, partsIn, zonedToUtc,
    periodKey, dayKey, startOfDay, startOfMonth, parseDay, addDays, addMonthsClamped, resolveRange
};
