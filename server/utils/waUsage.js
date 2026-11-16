const axios = require('axios');
const { Op } = require('sequelize');
const User = require('../models/User');
const Settings = require('../models/Settings');
const WaUsageDaily = require('../models/WaUsageDaily');
const MessageBilling = require('../models/MessageBilling');
const { groupFor } = require('./messageBilling');

const GRAPH = `https://graph.facebook.com/${process.env.META_GRAPH_VERSION || 'v25.0'}`;
const CHUNK_DAYS = 30;
const MAX_RANGE_DAYS = 366;
const STALE_MS = 10 * 60 * 1000;
const FREE_SERVICE_LIMIT = 1000;

const PAST_RANGE_TTL_MS = 6 * 60 * 60 * 1000;
const lastSync = new Map();   // `${userId}|${from}|${to}` -> { at, error, costMissing }
const inFlight = new Map();   // same key -> Promise

const CATEGORY_LABELS = {
    MARKETING: 'Promotional (marketing)',
    MARKETING_LITE: 'Promotional (lite)',
    UTILITY: 'Updates & alerts (utility)',
    AUTHENTICATION: 'OTP / login codes',
    AUTHENTICATION_INTERNATIONAL: 'OTP / login codes (international)',
    SERVICE: 'Chat replies (service)',
    REFERRAL_CONVERSION: 'Ad referral (free)'
};
const titleCase = (s) => String(s || 'Other').toLowerCase().replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase());

// Manual (key-based) connections store credentials in Settings; embedded signup stores them on User.
async function getCredentials(userId) {
    const settings = await Settings.findOne({ where: { userId }, attributes: ['metaAccessToken', 'metaBusinessAccountId'] });
    if (settings?.metaAccessToken && settings?.metaBusinessAccountId) {
        return { token: settings.metaAccessToken, wabaId: settings.metaBusinessAccountId };
    }
    const user = await User.findByPk(userId, { attributes: ['id', 'fbAccessToken', 'wabaId'] });
    if (user?.fbAccessToken && user?.wabaId) return { token: user.fbAccessToken, wabaId: user.wabaId };
    return null;
}

const ymd = (d) => d.toISOString().slice(0, 10);
const startOfDayUtc = (s) => new Date(`${s}T00:00:00.000Z`);

// costKnown=false when Meta returned no cost at all (e.g. shared partner credit line): don't call everything free.
function isFree(row, costKnown) {
    return String(row.pricingType || '').startsWith('FREE') || (costKnown && Number(row.cost) === 0);
}

async function fetchChunk(wabaId, token, startTs, endTs) {
    const fields = `pricing_analytics.start(${startTs}).end(${endTs}).granularity(DAILY)` +
        `.metric_types(["COST","VOLUME"]).dimensions(["PRICING_CATEGORY","PRICING_TYPE","COUNTRY"])`;
    const res = await axios.get(`${GRAPH}/${wabaId}`, { params: { fields, access_token: token }, timeout: 20000 });
    const blocks = res.data?.pricing_analytics?.data || [];
    return blocks.flatMap(b => b.data_points || []);
}

async function fetchCurrency(wabaId, token) {
    try {
        const res = await axios.get(`${GRAPH}/${wabaId}`, { params: { fields: 'currency', access_token: token }, timeout: 15000 });
        return res.data?.currency || null;
    } catch { return null; }
}

// Pull [from, to] (YYYY-MM-DD) from Meta and replace our stored snapshot for that window.
async function syncRange(userId, from, to) {
    const creds = await getCredentials(userId);
    if (!creds) return { ok: false, reason: 'not_connected' };

    const currency = await fetchCurrency(creds.wabaId, creds.token);
    const rows = [];
    let sawPoints = false, sawCost = false;
    try {
        let cursor = startOfDayUtc(from);
        const end = startOfDayUtc(to);
        while (cursor <= end) {
            const chunkEnd = new Date(Math.min(end.getTime(), cursor.getTime() + (CHUNK_DAYS - 1) * 86400000));
            const startTs = Math.floor(cursor.getTime() / 1000);
            const endTs = Math.floor(chunkEnd.getTime() / 1000) + 86399;
            const points = await fetchChunk(creds.wabaId, creds.token, startTs, endTs);
            for (const p of points) {
                sawPoints = true;
                if (p.cost !== undefined && p.cost !== null) sawCost = true;
                const d = new Date((p.start || startTs) * 1000);
                rows.push({
                    userId,
                    date: ymd(d),
                    pricingCategory: String(p.pricing_category || '').toUpperCase(),
                    pricingType: String(p.pricing_type || '').toUpperCase(),
                    country: String(p.country || '').toUpperCase(),
                    volume: parseInt(p.volume || 0, 10),
                    cost: Number(p.cost || 0),
                    currency
                });
            }
            cursor = new Date(chunkEnd.getTime() + 86400000);
        }
    } catch (err) {
        const meta = err.response?.data?.error;
        return { ok: false, reason: meta?.code === 190 ? 'token_expired' : 'meta_error', detail: meta?.message || err.message };
    }

    // Merge duplicate keys (Meta can return the same dimensions more than once per day), then replace the window.
    const merged = new Map();
    for (const r of rows) {
        const k = [r.date, r.pricingCategory, r.pricingType, r.country].join('|');
        const prev = merged.get(k);
        if (prev) { prev.volume += r.volume; prev.cost += r.cost; } else merged.set(k, { ...r });
    }
    await WaUsageDaily.destroy({ where: { userId, date: { [Op.between]: [from, to] } } });
    if (merged.size) await WaUsageDaily.bulkCreate([...merged.values()]);
    return { ok: true, rows: merged.size, currency, costMissing: sawPoints && !sawCost };
}

// Sync only when this range's snapshot is stale; concurrent callers share one run.
async function ensureFresh(userId, from, to, { force = false } = {}) {
    const key = `${userId}|${from}|${to}`;
    const ttl = to < ymd(new Date()) ? PAST_RANGE_TTL_MS : STALE_MS;
    const prev = lastSync.get(key);
    if (!force && prev && !prev.error && Date.now() - prev.at < ttl) return prev;
    if (inFlight.has(key)) return inFlight.get(key);

    const run = (async () => {
        const result = await syncRange(userId, from, to);
        const state = {
            at: Date.now(),
            error: result.ok ? null : (result.reason || 'meta_error'),
            detail: result.detail || null,
            costMissing: !!result.costMissing
        };
        if (lastSync.size > 500) lastSync.delete(lastSync.keys().next().value);
        lastSync.set(key, state);
        return state;
    })().finally(() => inFlight.delete(key));
    inFlight.set(key, run);
    return run;
}

function clampRange(from, to) {
    const today = ymd(new Date());
    let end = to && to <= today ? to : today;
    let start = from || end.slice(0, 8) + '01';
    const min = ymd(new Date(Date.now() - MAX_RANGE_DAYS * 86400000));
    if (start < min) start = min;
    if (start > end) start = end;
    return { from: start, to: end };
}

async function getUsageSummary(userId, rawFrom, rawTo, opts = {}) {
    if (!(await getCredentials(userId))) return { connected: false };

    const { from, to } = clampRange(rawFrom, rawTo);
    // Sync from the 1st of the month so the 1,000 free service messages can be counted from the start.
    const sync = await ensureFresh(userId, from.slice(0, 8) + '01', to, { force: !!opts.force });

    const rows = await WaUsageDaily.findAll({ where: { userId, date: { [Op.between]: [from, to] } }, raw: true });
    const currency = rows.find(r => r.currency)?.currency || null;

    const costKnown = !sync?.costMissing;

    // Free allowance: first 1,000 service messages per number per calendar month, applied chronologically.
    // A row that Meta priced at 0 is entirely free; a priced row is free only for the part still inside the allowance.
    const svcRows = await WaUsageDaily.findAll({
        where: { userId, pricingCategory: 'SERVICE', date: { [Op.between]: [from.slice(0, 8) + '01', to] } }, raw: true
    });
    svcRows.sort((a, b) => String(a.date).localeCompare(String(b.date)));
    const freePart = new Map();
    const usedByMonth = {};
    for (const r of svcRows) {
        if (String(r.pricingType).startsWith('FREE')) continue;
        const month = String(r.date).slice(0, 7);
        const used = usedByMonth[month] || 0;
        const vol = Number(r.volume);
        const remaining = Math.max(0, FREE_SERVICE_LIMIT - used);
        freePart.set(r.id, (costKnown && Number(r.cost) === 0) ? vol : Math.min(vol, remaining));
        usedByMonth[month] = used + vol;
    }
    let spend = 0, volume = 0, paid = 0, free = 0;
    const byCategory = new Map();
    const daily = new Map();
    for (const r of rows) {
        const cost = Number(r.cost), vol = Number(r.volume);
        spend += cost; volume += vol;
        if (freePart.has(r.id)) { free += freePart.get(r.id); paid += vol - freePart.get(r.id); }
        else if (isFree(r, costKnown)) free += vol; else paid += vol;

        const catKey = String(r.pricingType).startsWith('FREE') ? 'FREE' : (r.pricingCategory || 'OTHER');
        const c = byCategory.get(catKey) || { key: catKey, volume: 0, cost: 0 };
        c.volume += vol; c.cost += cost; byCategory.set(catKey, c);

        const d = daily.get(r.date) || { date: r.date, cost: 0, volume: 0 };
        d.cost += cost; d.volume += vol; daily.set(r.date, d);
    }

    // Free allowance: first 1,000 service messages per number per calendar month.
    const monthStart = ymd(new Date()).slice(0, 8) + '01';
    const monthRows = await WaUsageDaily.findAll({
        where: { userId, date: { [Op.gte]: monthStart }, pricingCategory: 'SERVICE' }, raw: true
    });
    const serviceThisMonth = monthRows
        .filter(r => !String(r.pricingType).startsWith('FREE'))
        .reduce((s, r) => s + Number(r.volume), 0);

    // By feature (message counts only, from our own per-message records).
    const fromDate = startOfDayUtc(from);
    const toDate = new Date(startOfDayUtc(to).getTime() + 86399999);
    const msgs = await MessageBilling.findAll({
        where: { userId, status: { [Op.in]: ['delivered', 'read'] }, createdAt: { [Op.between]: [fromDate, toDate] } },
        attributes: ['source', 'billable'], raw: true
    });
    const byFeature = new Map();
    for (const m of msgs) {
        const g = groupFor(m.source);
        const f = byFeature.get(g.key) || { key: g.key, label: g.label, delivered: 0, paid: 0 };
        f.delivered += 1; if (m.billable === true) f.paid += 1;
        byFeature.set(g.key, f);
    }

    return {
        connected: true,
        currency,
        range: { from, to },
        syncedAt: sync?.at ? new Date(sync.at).toISOString() : null,
        syncError: sync?.error || null,
        costAvailable: costKnown,
        totals: { spend, volume, paid, free },
        byCategory: [...byCategory.values()]
            .map(c => ({ ...c, label: c.key === 'FREE' ? 'Free messages' : (CATEGORY_LABELS[c.key] || titleCase(c.key)) }))
            .sort((a, b) => b.cost - a.cost || b.volume - a.volume),
        daily: [...daily.values()].sort((a, b) => a.date.localeCompare(b.date)),
        freeAllowance: { limit: FREE_SERVICE_LIMIT, used: Math.min(serviceThisMonth, FREE_SERVICE_LIMIT), serviceThisMonth },
        byFeature: [...byFeature.values()].sort((a, b) => b.delivered - a.delivered),
        loggedDelivered: msgs.length
    };
}

module.exports = { getUsageSummary, ensureFresh, syncRange, clampRange, ymd };
