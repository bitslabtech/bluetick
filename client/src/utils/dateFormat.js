// Shared date/time display helpers.
//
// Every date shown in the UI goes through these functions so the whole app uses
// one format: the user's Settings.dateFormat (DD/MM/YYYY, MM/DD/YYYY or YYYY/MM/DD)
// and the account time zone (User.timezone, default Asia/Kolkata; superadmins use
// Asia/Kolkata). UIContext keeps the active config up to date via setDateConfig().
//
// Only for display. Dates sent to the server or written to CSV stay ISO.

export const DEFAULT_TIMEZONE = 'Asia/Kolkata';
export const ADMIN_TIMEZONE = 'Asia/Kolkata';
export const DEFAULT_DATE_FORMAT = 'DD/MM/YYYY';
const DATE_FORMATS = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD', 'YYYY/MM/DD'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

let config = { dateFormat: DEFAULT_DATE_FORMAT, timeZone: DEFAULT_TIMEZONE };

const validTz = (tz) => {
    if (!tz) return false;
    try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return true; } catch { return false; }
};

export function setDateConfig({ dateFormat, timeZone } = {}) {
    config = {
        dateFormat: DATE_FORMATS.includes(dateFormat) ? dateFormat : DEFAULT_DATE_FORMAT,
        timeZone: validTz(timeZone) ? timeZone : DEFAULT_TIMEZONE,
    };
}

export const getDateConfig = () => config;

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTH_ONLY = /^(\d{4})-(\d{2})$/;

const fmtCache = new Map();
function partsFormatter(timeZone) {
    let f = fmtCache.get(timeZone);
    if (!f) {
        f = new Intl.DateTimeFormat('en-US', {
            timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
        });
        fmtCache.set(timeZone, f);
    }
    return f;
}

// Resolve any input to calendar parts { y, m (1-12), d, h, min, s, dateOnly }
// in the configured time zone. Plain "YYYY-MM-DD" / "YYYY-MM" strings are
// calendar dates, not instants, so they are not shifted by the time zone.
function toParts(input, opts = {}) {
    if (input === null || input === undefined || input === '') return null;
    if (typeof input === 'string') {
        const dm = input.match(DATE_ONLY);
        if (dm) return { y: +dm[1], m: +dm[2], d: +dm[3], h: 0, min: 0, s: 0, dateOnly: true };
        const mm = input.match(MONTH_ONLY);
        if (mm) return { y: +mm[1], m: +mm[2], d: 1, h: 0, min: 0, s: 0, dateOnly: true };
    }
    const date = input instanceof Date ? input : new Date(input);
    if (isNaN(date.getTime())) return null;
    const tz = opts.timeZone || config.timeZone;
    let f;
    try { f = partsFormatter(tz); } catch { f = partsFormatter(DEFAULT_TIMEZONE); }
    const p = {};
    for (const { type, value } of f.formatToParts(date)) p[type] = value;
    return { y: +p.year, m: +p.month, d: +p.day, h: +p.hour % 24, min: +p.minute, s: +p.second, dateOnly: false };
}

const pad = (n) => String(n).padStart(2, '0');

function datePart(p, dateFormat) {
    const fmt = dateFormat || config.dateFormat;
    if (fmt === 'MM/DD/YYYY') return `${pad(p.m)}/${pad(p.d)}/${p.y}`;
    if (fmt === 'YYYY-MM-DD') return `${p.y}-${pad(p.m)}-${pad(p.d)}`;
    if (fmt === 'YYYY/MM/DD') return `${p.y}/${pad(p.m)}/${pad(p.d)}`;
    return `${pad(p.d)}/${pad(p.m)}/${p.y}`;
}

function timePart(p, { seconds = false } = {}) {
    const h12 = p.h % 12 || 12;
    return `${h12}:${pad(p.min)}${seconds ? `:${pad(p.s)}` : ''} ${p.h < 12 ? 'AM' : 'PM'}`;
}

/** 16/11/2026 (per the dateFormat setting). */
export function formatDate(input, opts = {}) {
    const p = toParts(input, opts);
    if (!p) return opts.fallback ?? '-';
    return datePart(p, opts.dateFormat);
}

/** 3:45 PM */
export function formatTime(input, opts = {}) {
    const p = toParts(input, opts);
    if (!p) return opts.fallback ?? '-';
    return timePart(p, opts);
}

/** 16/11/2026, 3:45 PM */
export function formatDateTime(input, opts = {}) {
    const p = toParts(input, opts);
    if (!p) return opts.fallback ?? '-';
    if (p.dateOnly) return datePart(p, opts.dateFormat);
    return `${datePart(p, opts.dateFormat)}, ${timePart(p, opts)}`;
}

/** Short label for chart axes and compact lists: "16 Nov" (or "Nov 16" for MM/DD/YYYY). */
export function formatShortDate(input, opts = {}) {
    const p = toParts(input, opts);
    if (!p) return opts.fallback ?? '-';
    const fmt = opts.dateFormat || config.dateFormat;
    return fmt === 'MM/DD/YYYY' ? `${MONTHS[p.m - 1]} ${p.d}` : `${p.d} ${MONTHS[p.m - 1]}`;
}

/** Month label: "Nov 2026" (opts.short → "Nov"). */
export function formatMonth(input, opts = {}) {
    const p = toParts(input, opts);
    if (!p) return opts.fallback ?? '-';
    return opts.short ? MONTHS[p.m - 1] : `${MONTHS[p.m - 1]} ${p.y}`;
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Weekday name: "Mon" (opts.long → "Monday"). */
export function formatWeekday(input, opts = {}) {
    const p = toParts(input, opts);
    if (!p) return opts.fallback ?? '-';
    const name = WEEKDAYS[new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay()];
    return opts.long ? name : name.slice(0, 3);
}

// Day number (days since epoch) of a calendar date, for comparing days.
const dayNum = (p) => Math.floor(Date.UTC(p.y, p.m - 1, p.d) / 86400000);

/** "just now", "5m ago", "3h ago", "Yesterday", "4d ago", then the date. */
export function formatRelative(input, opts = {}) {
    const p = toParts(input, opts);
    if (!p) return opts.fallback ?? '-';
    if (p.dateOnly) return datePart(p, opts.dateFormat);
    const date = input instanceof Date ? input : new Date(input);
    const diffSec = Math.round((Date.now() - date.getTime()) / 1000);
    if (diffSec < 0) return formatDateTime(input, opts);
    if (diffSec < 60) return 'just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    const today = toParts(new Date(), opts);
    const days = dayNum(today) - dayNum(p);
    if (days === 0) return `${Math.floor(diffSec / 3600)}h ago`;
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    return datePart(p, opts.dateFormat);
}

/** Chat-list style stamp: time if today, "Yesterday", else the date. */
export function formatSmart(input, opts = {}) {
    const p = toParts(input, opts);
    if (!p) return opts.fallback ?? '';
    if (p.dateOnly) return datePart(p, opts.dateFormat);
    const days = dayNum(toParts(new Date(), opts)) - dayNum(p);
    if (days === 0) return timePart(p, opts);
    if (days === 1) return 'Yesterday';
    return datePart(p, opts.dateFormat);
}

/** Calendar key "YYYY-MM-DD" of an instant in the account time zone (for grouping, not display). */
export function dateKey(input, opts = {}) {
    const p = toParts(input, opts);
    if (!p) return '';
    return `${p.y}-${pad(p.m)}-${pad(p.d)}`;
}
