const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const DeviceToken = require('../models/DeviceToken');

const isExpoToken = (t) => typeof t === 'string' && /^Expo(nent)?PushToken\[.+\]$/.test(t);

// POST /api/devices — register (or re-assign) this device's Expo push token
router.post('/', auth, async (req, res) => {
    try {
        const { token, platform } = req.body || {};
        if (!isExpoToken(token)) return res.status(400).json({ error: 'Invalid Expo push token' });
        const existing = await DeviceToken.findOne({ where: { token } });
        if (existing) {
            await existing.update({ userId: req.user.id, platform: platform || existing.platform });
        } else {
            await DeviceToken.create({ userId: req.user.id, token, platform: platform || null });
        }
        res.json({ ok: true });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server Error' });
    }
});

// POST /api/devices/call-tokens — register this device's incoming-call token:
//   { token, type: 'FCM' | 'APNS_VOIP' }  (type is exactly what expo-callkit-telecom reports)
// Kept separate from the Expo chat token: call pushes are raw FCM / APNs VoIP, never via Expo.
router.post('/call-tokens', auth, async (req, res) => {
    try {
        const { token, type } = req.body || {};
        const kind = type === 'FCM' ? 'fcm' : type === 'APNS_VOIP' ? 'apns_voip' : null;
        if (!kind) return res.status(400).json({ error: "type must be 'FCM' or 'APNS_VOIP'" });
        if (typeof token !== 'string' || token.length < 20 || token.length > 512) return res.status(400).json({ error: 'Invalid token' });
        const platform = kind === 'apns_voip' ? 'ios' : 'android';
        const existing = await DeviceToken.findOne({ where: { token } });
        if (existing) {
            await existing.update({ userId: req.user.id, platform, kind });
        } else {
            await DeviceToken.create({ userId: req.user.id, token, platform, kind });
        }
        res.json({ ok: true });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server Error' });
    }
});

// DELETE /api/devices — unregister (on logout)
router.delete('/', auth, async (req, res) => {
    try {
        const token = req.body?.token || req.query?.token;
        if (!token) return res.status(400).json({ error: 'token required' });
        await DeviceToken.destroy({ where: { token, userId: req.user.id } });
        res.json({ ok: true });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server Error' });
    }
});

module.exports = router;
