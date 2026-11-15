/**
 * Incoming-call pushes. No new dependencies: FCM v1 (Android) and APNs VoIP (iOS) are signed with
 * `jsonwebtoken` and sent with `fetch` / Node's http2.
 *
 * Environment (all optional; a missing transport is skipped with a warning, never throws):
 *   FCM_SERVICE_ACCOUNT_JSON   the Firebase service-account JSON, raw or base64   (Android)
 *   FCM_SERVICE_ACCOUNT_PATH   alternative: path to that JSON file                (Android)
 *   APNS_KEY                   the .p8 key contents (raw or base64)                (iOS)
 *   APNS_KEY_PATH              alternative: path to the .p8 file                   (iOS)
 *   APNS_KEY_ID, APNS_TEAM_ID, APNS_BUNDLE_ID   Apple Developer values            (iOS)
 *   APNS_PRODUCTION            'true' for the production gateway, else sandbox     (iOS)
 *
 * Payload shapes are the ones expo-callkit-telecom parses natively:
 *   incomingCall: { eventId, serverCallId, hasVideo, startedAt, caller{ id, displayName, phoneNumber }, metadata }
 *   callEnded:    { eventId, serverCallId, reason }
 */
const crypto = require('crypto');
const fs = require('fs');
const http2 = require('http2');
const jwt = require('jsonwebtoken');

const readMaybeBase64 = (raw) => {
    if (!raw) return null;
    const t = raw.trim();
    if (t.startsWith('{') || t.startsWith('-----')) return t;
    try { return Buffer.from(t, 'base64').toString('utf8'); } catch { return t; }
};

let cachedSA;
function serviceAccount() {
    if (cachedSA !== undefined) return cachedSA;
    try {
        const raw = process.env.FCM_SERVICE_ACCOUNT_JSON
            ? readMaybeBase64(process.env.FCM_SERVICE_ACCOUNT_JSON)
            : process.env.FCM_SERVICE_ACCOUNT_PATH ? fs.readFileSync(process.env.FCM_SERVICE_ACCOUNT_PATH, 'utf8') : null;
        cachedSA = raw ? JSON.parse(raw) : null;
    } catch (e) {
        console.error('[CALL PUSH] FCM service account unreadable:', e.message);
        cachedSA = null;
    }
    return cachedSA;
}

let fcmTokenCache = { token: null, exp: 0 };
async function fcmAccessToken(sa) {
    const now = Math.floor(Date.now() / 1000);
    if (fcmTokenCache.token && fcmTokenCache.exp - 60 > now) return fcmTokenCache.token;
    const assertion = jwt.sign(
        { iss: sa.client_email, scope: 'https://www.googleapis.com/auth/firebase.messaging', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 },
        sa.private_key,
        { algorithm: 'RS256' },
    );
    const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
    });
    const json = await res.json();
    if (!json.access_token) throw new Error(`FCM token exchange failed: ${JSON.stringify(json)}`);
    fcmTokenCache = { token: json.access_token, exp: now + (json.expires_in || 3600) };
    return fcmTokenCache.token;
}

/** Send one FCM data message. Returns { ok, dead } where dead = token is permanently invalid. */
async function sendFcm(token, data, ttl = '45s') {
    const sa = serviceAccount();
    if (!sa) { console.warn('[CALL PUSH] FCM not configured; Android call push skipped'); return { ok: false, dead: false }; }
    try {
        const access = await fcmAccessToken(sa);
        const res = await fetch(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${access}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: { token, android: { priority: 'HIGH', ttl }, data } }),
        });
        if (res.ok) return { ok: true, dead: false };
        const text = await res.text();
        const dead = /UNREGISTERED|INVALID_ARGUMENT|NOT_FOUND/.test(text) && res.status !== 401;
        console.warn(`[CALL PUSH] FCM ${res.status}: ${text.slice(0, 200)}`);
        return { ok: false, dead };
    } catch (e) {
        console.error('[CALL PUSH] FCM error:', e.message);
        return { ok: false, dead: false };
    }
}

let apnsJwt = { token: null, iat: 0 };
function apnsConfig() {
    const key = process.env.APNS_KEY ? readMaybeBase64(process.env.APNS_KEY)
        : process.env.APNS_KEY_PATH ? (() => { try { return fs.readFileSync(process.env.APNS_KEY_PATH, 'utf8'); } catch { return null; } })() : null;
    const { APNS_KEY_ID: keyId, APNS_TEAM_ID: teamId, APNS_BUNDLE_ID: bundleId } = process.env;
    if (!key || !keyId || !teamId || !bundleId) return null;
    return { key, keyId, teamId, bundleId, host: process.env.APNS_PRODUCTION === 'true' ? 'https://api.push.apple.com' : 'https://api.sandbox.push.apple.com' };
}
function apnsAuth(cfg) {
    const now = Math.floor(Date.now() / 1000);
    if (apnsJwt.token && now - apnsJwt.iat < 2400) return apnsJwt.token; // Apple wants a refresh between 20 and 60 minutes
    apnsJwt = { token: jwt.sign({ iss: cfg.teamId, iat: now }, cfg.key, { algorithm: 'ES256', header: { alg: 'ES256', kid: cfg.keyId } }), iat: now };
    return apnsJwt.token;
}

/** Send one APNs VoIP push. Returns { ok, dead }. */
function sendApnsVoip(deviceToken, payload) {
    const cfg = apnsConfig();
    if (!cfg) { console.warn('[CALL PUSH] APNs not configured; iOS call push skipped'); return Promise.resolve({ ok: false, dead: false }); }
    return new Promise((resolve) => {
        let settled = false;
        const done = (r) => { if (!settled) { settled = true; resolve(r); } };
        try {
            const client = http2.connect(cfg.host);
            client.on('error', (e) => { console.error('[CALL PUSH] APNs connection error:', e.message); done({ ok: false, dead: false }); });
            const req = client.request({
                ':method': 'POST',
                ':path': `/3/device/${deviceToken}`,
                authorization: `bearer ${apnsAuth(cfg)}`,
                'apns-topic': `${cfg.bundleId}.voip`,
                'apns-push-type': 'voip',
                'apns-priority': '10',
                'apns-expiration': '0',
            });
            let status = 0; let body = '';
            req.on('response', (h) => { status = h[':status']; });
            req.on('data', (c) => { body += c; });
            req.on('end', () => {
                client.close();
                if (status === 200) return done({ ok: true, dead: false });
                console.warn(`[CALL PUSH] APNs ${status}: ${body.slice(0, 200)}`);
                done({ ok: false, dead: status === 410 || /BadDeviceToken|Unregistered|DeviceTokenNotForTopic/.test(body) });
            });
            req.on('error', (e) => { client.close(); console.error('[CALL PUSH] APNs request error:', e.message); done({ ok: false, dead: false }); });
            req.setTimeout(8000, () => { req.close(); client.close(); done({ ok: false, dead: false }); });
            req.end(JSON.stringify(payload));
        } catch (e) {
            console.error('[CALL PUSH] APNs error:', e.message);
            done({ ok: false, dead: false });
        }
    });
}

/** Push an "incoming call" to one device. `device` = { token, kind }. */
function pushIncomingCall(device, event) {
    return device.kind === 'apns_voip'
        ? sendApnsVoip(device.token, { incomingCall: event })
        : sendFcm(device.token, { messageType: 'incomingCall', incomingCall: JSON.stringify(event) });
}

/**
 * Push a "call ended" so a ringing phone stops (answered elsewhere, caller hung up, timeout).
 * Android only: on iOS every VoIP push MUST report a new call to CallKit (Apple kills apps that
 * don't), and the library does not handle callEnded over PushKit. An iOS phone whose app is
 * running is stopped through the socket; a killed one rings until incomingCallTimeout (45 s).
 */
async function pushCallEnded(device, serverCallId, reason) {
    if (device.kind === 'apns_voip') return { ok: false, dead: false };
    const ended = { eventId: crypto.randomUUID(), serverCallId, reason };
    return sendFcm(device.token, { messageType: 'callEnded', callEnded: JSON.stringify(ended) }, '30s');
}

module.exports = { pushIncomingCall, pushCallEnded };
