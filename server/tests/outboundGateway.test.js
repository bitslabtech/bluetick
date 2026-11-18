/**
 * Outbound gateway guards and rules (no DB, no network).
 *
 * The first test is the important one: it fails the build if any code sends a WhatsApp message by
 * calling Meta's /{phone-number-id}/messages endpoint directly instead of services/outbound.
 * That is what guarantees a new feature cannot skip the reports, the plan limit or the usage page.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SKIP_DIRS = new Set(['node_modules', 'public', 'uploads', 'logs', 'tests', 'plugins', '.git']);
const GATEWAY_DIR = path.join(ROOT, 'services', 'outbound');

function jsFiles(dir) {
    const out = [];
    for (const name of fs.readdirSync(dir)) {
        const full = path.join(dir, name);
        const st = fs.statSync(full);
        if (st.isDirectory()) { if (!SKIP_DIRS.has(name)) out.push(...jsFiles(full)); }
        else if (name.endsWith('.js')) out.push(full);
    }
    return out;
}

describe('outbound gateway guard', () => {
    test('no code calls Meta\'s send-message endpoint outside services/outbound', () => {
        // A URL ending in /messages built for the Graph API: graph.facebook.com/.../messages, or
        // `${GRAPH}/${phoneId}/messages`-style templates
        const direct = /graph\.facebook\.com[^'"`\n]*\/messages\b|\$\{[^}]*\}\/messages[`'"]/;
        const offenders = [];
        for (const file of jsFiles(ROOT)) {
            if (file.startsWith(GATEWAY_DIR)) continue;
            const lines = fs.readFileSync(file, 'utf8').split('\n');
            lines.forEach((line, i) => {
                if (!direct.test(line)) return;
                if (/console\.(log|warn|error)|^\s*(\/\/|\*)/.test(line)) return; // log text and comments
                offenders.push(`${path.relative(ROOT, file)}:${i + 1}: ${line.trim()}`);
            });
        }
        expect(offenders).toEqual([]);
    });

    test('every source used in code is registered', () => {
        const { SOURCES } = require('../services/outbound/sources');
        const used = new Set();
        const re = /(?<![\w])source:\s*'([a-z_]+)'/g;
        for (const file of jsFiles(ROOT)) {
            const text = fs.readFileSync(file, 'utf8');
            if (!/outbound|sendWhatsAppAndLog|sendSystemMessage/.test(text)) continue;
            let m;
            while ((m = re.exec(text))) used.add(m[1]);
        }
        // Keys used for other purposes in the same files (ChatMessage.source values, Meta CAPI, the inbound 'call' record etc.)
        const NOT_GATEWAY = new Set(['campaign', 'inbox', 'flowbot', 'auto_reply', 'ai_bot', 'admin', 'online', 'pos', 'meta', 'local', 'empty', 'error', 'not_connected', 'call']);
        const unknown = [...used].filter(s => !SOURCES[s] && !NOT_GATEWAY.has(s));
        expect(unknown).toEqual([]);
    });
});

describe('status rules', () => {
    const { canMove } = require('../services/outbound/status');
    test('statuses only move forward', () => {
        expect(canMove('sent', 'delivered')).toBe(true);
        expect(canMove('read', 'delivered')).toBe(false);   // late delivered never undoes read
        expect(canMove('delivered', 'sent')).toBe(false);
        expect(canMove('CLICKED', 'read')).toBe(false);     // campaign log statuses are upper case
        expect(canMove('SENT', 'read')).toBe(true);
        expect(canMove('sent', 'failed')).toBe(true);
        expect(canMove('delivered', 'failed')).toBe(false);
        expect(canMove('retry_pending', 'delivered')).toBe(false);
        expect(canMove('blocked', 'sent')).toBe(false);
    });
});

describe('sources', () => {
    const { getSource, countsTowardPlan, groupFor } = require('../services/outbound/sources');
    test('unknown source is refused', () => {
        expect(() => getSource('store_new_feature')).toThrow(/Unknown message source/);
    });
    test('every customer message counts toward the plan; Bluetick and outside messages do not', () => {
        for (const s of ['campaign', 'inbox', 'api', 'flowbot', 'ai_bot', 'opt_out_ack', 'store_otp', 'store_order', 'forms', 'gateway_test']) {
            expect(countsTowardPlan(s)).toBe(true);
        }
        expect(countsTowardPlan('platform_otp')).toBe(false);
        expect(countsTowardPlan('external')).toBe(false);
        expect(groupFor('no_such_key').key).toBe('external');
    });
});

describe('account time zone ranges', () => {
    const t = require('../services/outbound/time');
    const TZ = 'Asia/Kolkata';
    test('month and day boundaries are in the account time zone', () => {
        // 2026-11-16 20:00 UTC = 2026-11-17 01:30 IST
        const at = new Date('2026-11-16T20:00:00Z');
        expect(t.dayKey(at, TZ)).toBe('2026-11-17');
        expect(t.periodKey(new Date('2026-11-30T19:00:00Z'), TZ)).toBe('2026-12');
        expect(t.startOfDay(at, TZ).toISOString()).toBe('2026-11-16T18:30:00.000Z');
    });
    test('custom range covers the whole last day', () => {
        const { start, end } = t.resolveRange('custom', '2026-11-01', '2026-11-15', TZ);
        expect(start.toISOString()).toBe('2026-10-31T18:30:00.000Z');
        expect(end.toISOString()).toBe('2026-11-15T18:30:00.000Z');
    });
    test('one month back from the 31st clamps to the end of the shorter month', () => {
        const now = new Date('2026-03-31T06:00:00Z');
        const { start } = t.resolveRange('1m', null, null, TZ, now);
        expect(t.dayKey(start, TZ)).toBe('2026-02-28');
    });
    test('last 7 days = today and the 6 days before', () => {
        const now = new Date('2026-11-17T06:00:00Z');
        const { start } = t.resolveRange('7d', null, null, TZ, now);
        expect(t.dayKey(start, TZ)).toBe('2026-11-11');
    });
});
