const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const MetaAdCampaign = require('../models/MetaAdCampaign');

// GET /api/meta-ads-webhook - Verification
router.get('/', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    const verifyToken = process.env.WEBHOOK_VERIFY_TOKEN; 

    if (mode && token) {
        if (mode === 'subscribe' && token === verifyToken) {
            console.log('META ADS WEBHOOK VERIFIED');
            res.status(200).send(challenge);
        } else {
            res.sendStatus(403);
        }
    } else {
        res.sendStatus(400);
    }
});

// POST /api/meta-ads-webhook
router.post('/', async (req, res) => {
    try {
        console.log('[META ADS WEBHOOK] Received payload:', JSON.stringify(req.body, null, 2));
        
        const { object, entry } = req.body;
        
        if (object === 'page' || object === 'application') {
            for (const ent of entry) {
                if (ent.changes) {
                    for (const change of ent.changes) {
                        if (change.field === 'ad_campaign_delivery' || change.field === 'ad_delivery') {
                            console.log('[META ADS WEBHOOK] Delivery update:', change.value);
                            // Process delivery status updates if applicable
                        }
                    }
                }
            }
        }
        
        res.sendStatus(200);
    } catch (error) {
        console.error('[META ADS WEBHOOK ERROR]', error);
        res.sendStatus(500);
    }
});

module.exports = router;
