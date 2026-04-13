const axios = require('axios');
const crypto = require('crypto');
const Webhook = require('../models/Webhook');

/**
 * Dispatch an event to all registered webhooks for a user
 * @param {String} userId - The workspace owner ID
 * @param {String} eventName - Standardized event name (e.g., 'message.received', 'campaign.completed')
 * @param {Object} payload - Data to send to the webhook
 */
const dispatchWebhook = async (userId, eventName, payload) => {
    try {
        // Find all active webhooks for this user that subscribe to this event
        const webhooks = await Webhook.findAll({
            where: {
                userId,
                isActive: true
            }
        });

        // Filter those that include the eventName
        const targetWebhooks = webhooks.filter(wh => wh.events.includes(eventName) || wh.events.includes('*'));

        if (targetWebhooks.length === 0) return; // Nothing to do

        const timestamp = new Date().toISOString();
        const requestPayload = {
            event: eventName,
            timestamp,
            data: payload
        };

        const payloadString = JSON.stringify(requestPayload);

        // Fire and forget (running in background so we don't block the main thread)
        targetWebhooks.forEach(async (webhook) => {
            try {
                // Generate HMAC signature for security payload verification
                const signature = crypto
                    .createHmac('sha256', webhook.secret)
                    .update(payloadString)
                    .digest('hex');

                await axios.post(webhook.url, requestPayload, {
                    headers: {
                        'Content-Type': 'application/json',
                        'x-webhook-signature': signature,
                        'x-webhook-timestamp': timestamp
                    },
                    timeout: 5000 // 5 second timeout so a slow client doesn't hold up Node's event loop
                });

                // Reset failures on success if it had failed before
                if (webhook.failureCount > 0) {
                    webhook.failureCount = 0;
                    webhook.save().catch(()=>{});
                }
            } catch (err) {
                console.error(`Webhook Dispatch Error [${webhook.id}] -> ${webhook.url}:`, err.message);
                
                // Track failures
                webhook.failureCount += 1;
                webhook.lastFailedAt = new Date();
                
                // Auto-disable if failing consistently (e.g. 10 failures)
                if (webhook.failureCount > 10) {
                    webhook.isActive = false;
                    console.log(`Auto-disabled Webhook [${webhook.id}] due to excessive failures.`);
                }
                webhook.save().catch(()=>{});
            }
        });

    } catch (error) {
        console.error('Master Webhook Dispatch Error:', error);
    }
};

module.exports = {
    dispatchWebhook
};
