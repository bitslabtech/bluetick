const express = require('express');
const router = express.Router();
const MessageLog = require('../models/MessageLog');

// 1. Verify Webhook (GET) - LEGACY ROUTE
router.get('/', (req, res) => {
    console.log("[LEGACY WEBHOOK] Warning: Meta verified the legacy /api/webhooks route. Please update Meta to use /api/webhook/:userId");
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    const verifyToken = process.env.WEBHOOK_VERIFY_TOKEN; // Use environment variable

    if (mode && token) {
        if (mode === 'subscribe' && token === verifyToken) {
            console.log('WEBHOOK_VERIFIED (LEGACY)');
            res.status(200).send(challenge);
        } else {
            res.sendStatus(403);
        }
    } else {
        res.sendStatus(400);
    }
});

// 2. Handle Event (POST) - DEPRECATED
// 2. Receive (POST) - LEGACY ROUTE
// Older Meta apps may still point here. Instead of dropping the payload (which lost every status
// update and incoming message for those accounts), find the account by its phone number id and
// hand the request to the current handler (/api/webhook/:userId), which verifies the signature.
router.post('/', async (req, res, next) => {
    try {
        const body = req.body || {};
        const phoneNumberId = body.object === 'whatsapp_business_account'
            ? body.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id
            : null;
        let ownerId = null;
        if (phoneNumberId) {
            const Settings = require('../models/Settings');
            const User = require('../models/User');
            const s1 = await Settings.findOne({ where: { metaPhoneNumberId: String(phoneNumberId) }, attributes: ['userId'] });
            ownerId = s1?.userId || null;
            if (!ownerId) {
                const u = await User.findOne({ where: { metaPhoneNumberId: String(phoneNumberId) }, attributes: ['id'] });
                ownerId = u?.id || null;
            }
        }
        if (ownerId) {
            console.warn(`[LEGACY WEBHOOK] Payload for phone ${phoneNumberId} forwarded to /api/webhook/${ownerId}. Please update the callback URL in the Meta app to /api/webhook/${ownerId}.`);
            req.url = `/${ownerId}`;
            return require('./webhook')(req, res, next);
        }
        res.sendStatus(200);
        console.warn("[WARNING] Received payload on legacy /api/webhooks route with no matching account — ignored. Campaigns and Inbox messages are processed on /api/webhook/:userId.");
    } catch (err) {
        console.error('[LEGACY WEBHOOK] Forwarding failed:', err.message);
        if (!res.headersSent) res.sendStatus(200);
    }
});

module.exports = router;
