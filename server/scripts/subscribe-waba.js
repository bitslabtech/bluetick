// One-time script: Subscribe app to WABA webhooks
// Run: node server/scripts/subscribe-waba.js
require('dotenv').config();
const { sequelize } = require('../config/database');
const Settings = require('../models/Settings');

async function subscribeWaba() {
    try {
        await sequelize.authenticate();
        console.log('DB connected.');

        // Get the first user's settings (our admin)
        const settings = await Settings.findOne({
            where: {
                metaBusinessAccountId: { [require('sequelize').Op.ne]: '' }
            }
        });

        if (!settings) {
            console.error('No settings found with a WABA ID configured. Please save your WhatsApp settings first.');
            process.exit(1);
        }

        const wabaId = settings.metaBusinessAccountId;
        const token = settings.metaAccessToken;

        console.log(`\nSubscribing app to WABA: ${wabaId}`);
        console.log(`Using token: ${token.substring(0, 20)}...`);

        const response = await fetch(
            `https://graph.facebook.com/v19.0/${wabaId}/subscribed_apps`,
            {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            }
        );

        const data = await response.json();
        console.log('Meta API Response:', JSON.stringify(data, null, 2));

        if (data.success) {
            console.log('\n✅ SUCCESS! App is now subscribed to WABA webhooks.');
            console.log('Meta will now send real delivery/read/inbound message events to your webhook URL.');
        } else {
            console.error('\n❌ FAILED! Check the error above from Meta.');
            if (data.error?.code === 190) {
                console.error('→ Your Access Token is expired or invalid. Generate a new one from Meta Dashboard.');
            }
        }
    } catch (err) {
        console.error('Script error:', err);
    } finally {
        await sequelize.close();
    }
}

subscribeWaba();
