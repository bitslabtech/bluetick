const express = require('express');
const router = express.Router();
const MessageLog = require('../models/MessageLog');

// 1. Verify Webhook (GET) - LEGACY ROUTE
router.get('/', (req, res) => {
    console.log("[LEGACY WEBHOOK] Warning: Meta verified the legacy /api/webhooks route. Please update Meta to use /api/webhook/:userId");
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    const verifyToken = '12345678'; // Hardcoded as per the new unified standard

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
router.post('/', async (req, res) => {
    // Respond immediately to Meta to prevent retry loops
    res.sendStatus(200);
    console.warn("[WARNING] Received payload on legacy /api/webhooks route. Campaigns and Inbox messages are now processed on /api/webhook/:userId. Please update your Meta Developer Portal Webhook Callback URL.");
});

module.exports = router;
