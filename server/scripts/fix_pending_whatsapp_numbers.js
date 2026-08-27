require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const axios = require('axios');
const User = require('../models/User');
const Settings = require('../models/Settings');
const { sequelize } = require('../config/database');

async function healPendingNumbers() {
    console.log('===============================================================');
    console.log('🚀 WA CLOUD API: BATCH REGISTRATION HEALER');
    console.log('===============================================================');
    console.log('Finding all users with connected WhatsApp accounts...');

    try {
        const users = await User.findAll({
            where: {
                // Find users that have at least some WhatsApp credentials
                metaPhoneNumberId: { [require('sequelize').Op.not]: null }
            }
        });

        console.log(`Found ${users.length} total users with a phone number ID.\n`);
        let successCount = 0;
        let alreadyRegisteredCount = 0;
        let failCount = 0;

        for (const user of users) {
            console.log(`---------------------------------------------------------------`);
            console.log(`Processing User: ${user.email} (ID: ${user.id})`);
            
            // Try to find token in Settings if missing from User
            let accessToken = user.fbAccessToken;
            let displayPhone = user.metaDisplayPhoneNumber || '';
            
            if (!accessToken) {
                const settings = await Settings.findOne({ where: { userId: user.id } });
                if (settings && settings.metaAccessToken) {
                    accessToken = settings.metaAccessToken;
                }
            }

            if (!accessToken) {
                console.log(`⚠️  SKIPPED: No access token found for user.`);
                failCount++;
                continue;
            }

            // Derive PIN
            const digitsOnly = displayPhone.replace(/\D/g, '');
            const registrationPin = digitsOnly.length >= 6 
                ? digitsOnly.slice(-6) 
                : (process.env.WA_REGISTRATION_PIN || '000000');

            console.log(`➜ Phone: ${displayPhone || 'Unknown'} | ID: ${user.metaPhoneNumberId}`);
            console.log(`➜ Calling Meta API to register...`);

            try {
                const regRes = await axios.post(
                    `https://graph.facebook.com/v22.0/${user.metaPhoneNumberId}/register`,
                    {
                        messaging_product: 'whatsapp',
                        pin: registrationPin
                    },
                    {
                        headers: { Authorization: `Bearer ${accessToken}` }
                    }
                );
                
                console.log(`✅ SUCCESS: Phone number registered successfully!`);
                successCount++;

            } catch (err) {
                const errData = err.response?.data?.error;
                
                if (errData?.code === 80007) {
                    console.log(`ℹ️  ALREADY REGISTERED: This number is already active on the Cloud API.`);
                    alreadyRegisteredCount++;
                } else {
                    console.log(`❌ FAILED:`, errData?.message || err.message);
                    if (errData?.code === 10) console.log('   Hint: Number is tied to another WABA. Must be released first.');
                    if (errData?.code === 131031) console.log('   Hint: Business is not verified yet.');
                    failCount++;
                }
            }
            
            // Small delay to respect rate limits
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        console.log('\n===============================================================');
        console.log('📊 HEALER SUMMARY:');
        console.log(`Total Processed:    ${users.length}`);
        console.log(`Newly Registered:   ${successCount}`);
        console.log(`Already Registered: ${alreadyRegisteredCount}`);
        console.log(`Failed/Skipped:     ${failCount}`);
        console.log('===============================================================');
        
    } catch (error) {
        console.error('CRITICAL ERROR:', error);
    } finally {
        process.exit(0);
    }
}

// Ensure DB is connected before running
sequelize.authenticate()
    .then(() => {
        healPendingNumbers();
    })
    .catch(err => {
        console.error('Unable to connect to the database:', err);
        process.exit(1);
    });
