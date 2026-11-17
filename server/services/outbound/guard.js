/**
 * Runtime alarm: catches any WhatsApp message sent to Meta without the outbound gateway
 * (e.g. new code that calls axios / fetch directly, or a URL assembled at run time that the
 * static test cannot see). It never blocks the request — it logs it loudly and writes a
 * superadmin activity log entry (at most once per call site per hour), so the gap is noticed.
 *
 * Installed once at startup from index.js.
 */
const SEND_URL = /graph\.facebook\.com\/v\d+(\.\d+)?\/[^/?]+\/messages(\?|$)/;
const lastAlert = new Map(); // call site -> time

function callSite() {
    const lines = (new Error().stack || '').split('\n').slice(3);
    const own = lines.find(l => l.includes('/server/') && !l.includes('node_modules') && !l.includes('services/outbound/guard'));
    return (own || lines[0] || 'unknown').trim();
}

function alarm(url, via) {
    const site = callSite();
    console.error(`[OUTBOUND GUARD] WhatsApp message sent without the gateway (${via}) — it will NOT be counted in reports or the plan limit. URL: ${url} | ${site}`);
    const now = Date.now();
    if (now - (lastAlert.get(site) || 0) < 60 * 60 * 1000) return;
    lastAlert.set(site, now);
    try {
        const ActivityLog = require('../../models/ActivityLog');
        ActivityLog.create({
            userId: null,
            action: 'Uncounted WhatsApp send',
            details: `A message was sent to Meta without services/outbound (${via}). It is missing from reports and the plan limit. Call site: ${site}`
        }).catch(() => {});
    } catch (_) { /* never break the request */ }
}

let installed = false;
function install() {
    if (installed) return;
    installed = true;

    // axios (default instance, used by every sender in this codebase)
    const axios = require('axios');
    axios.interceptors.request.use((config) => {
        try {
            const url = `${config.baseURL || ''}${config.url || ''}`;
            if (String(config.method).toLowerCase() === 'post' && SEND_URL.test(url) && !config.btGateway) alarm(url, 'axios');
        } catch (_) { /* ignore */ }
        return config;
    });

    // global fetch
    if (typeof globalThis.fetch === 'function') {
        const realFetch = globalThis.fetch;
        globalThis.fetch = function guardedFetch(input, init) {
            try {
                const url = typeof input === 'string' ? input : (input?.url || String(input));
                const method = (init?.method || input?.method || 'GET').toUpperCase();
                if (method === 'POST' && SEND_URL.test(url)) alarm(url, 'fetch');
            } catch (_) { /* ignore */ }
            return realFetch.call(this, input, init);
        };
    }
}

module.exports = { install, SEND_URL };
