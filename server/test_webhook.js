const axios = require('axios');

async function testWebhook() {
    const payload = {
        object: 'whatsapp_business_account',
        entry: [
            {
                id: '122108780287413661', // Replace with the WABA ID you expect (get from Settings UI)
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
                                    id: 'wamid.HBgLMTU1NTEyMzQ1NjcVAgASG...=',
                                    timestamp: Math.floor(Date.now() / 1000).toString(),
                                    text: {
                                        body: 'Hello World from Test Script!'
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

    try {
        // Change to your actual User UUID from the Settings UI Webhook URL
        const res = await axios.post('http://localhost:5000/api/webhook/ad7deabd-778b-4842-8d86-4eaf3d55f7a4', payload);
        console.log('Success:', res.status, res.data);
    } catch (e) {
        console.error('Failure:', e.response?.status, e.response?.data || e.message);
    }
}

testWebhook();
