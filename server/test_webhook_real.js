const axios = require('axios');
const { Sequelize, DataTypes } = require('sequelize');
const { sequelize } = require('./config/database');
const User = require('./models/User');

async function testWebhook() {
    try {
        await sequelize.authenticate();
        console.log("Connected to DB to fetch credentials...");

        // Find the user with a WABA ID
        const user = await User.findOne({ where: { wabaId: { [Sequelize.Op.not]: null } } });
        if (!user) {
            console.error("No user found with a connected WABA ID!");
            process.exit(1);
        }

        console.log(`Testing with User ID: ${user.id} and WABA ID: ${user.wabaId}`);

        const payload = {
            object: 'whatsapp_business_account',
            entry: [
                {
                    id: user.wabaId,
                    changes: [
                        {
                            value: {
                                messaging_product: 'whatsapp',
                                metadata: {
                                    display_phone_number: '1234567890',
                                    phone_number_id: '1045618...'
                                },
                                contacts: [
                                    {
                                        profile: {
                                            name: 'Test Customer'
                                        },
                                        wa_id: '15551234567'
                                    }
                                ],
                                messages: [
                                    {
                                        from: '15551234567',
                                        id: `wamid.test_${Date.now()}`,
                                        timestamp: Math.floor(Date.now() / 1000).toString(),
                                        text: {
                                            body: 'Hello World from Real WABA Test Script!'
                                        },
                                        type: 'text'
                                    }
                                ]
                            },
                            field: 'messages'
                        }
                    ]
                }
            ]
        };

        const res = await axios.post(`http://localhost:5000/api/webhook/${user.id}`, payload);
        console.log('Webhook API Response:', res.status, res.data);
    } catch (e) {
        console.error('Failure:', e.response?.status, e.response?.data || e.message);
    } finally {
        process.exit(0);
    }
}

testWebhook();
