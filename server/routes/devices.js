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
