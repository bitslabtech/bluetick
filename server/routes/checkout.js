const express = require('express');
const router = express.Router();
const PaymentSession = require('../models/PaymentSession');
const Settings = require('../models/Settings');
const FormResponse = require('../models/FormResponse');
const Form = require('../models/Form');
// We require Stripe and Razorpay for actual integrations
const stripe = require('stripe');
const Razorpay = require('razorpay');

// Helper to get active keys from Settings
// For public endpoints, we need to find the settings of the form's owner.
// Since PaymentSession has the formId, we can trace it to the Form, then the User.

router.post('/init/:sessionId', async (req, res) => {
    try {
        const session = await PaymentSession.findOne({ 
            where: { id: req.params.sessionId },
            include: [{ model: Form, attributes: ['userId'] }]
        });

        if (!session) return res.status(404).json({ msg: 'Payment session not found or expired.' });

        // Retrieve keys from admin settings
        const settings = await Settings.findOne({ where: { userId: session.Form.userId } });
        const pgSettings = settings?.paymentGateways || {};

        if (session.gateway === 'razorpay') {
            const rzpKey = pgSettings.razorpay?.keyId;
            const rzpSecret = pgSettings.razorpay?.keySecret;
            
            if (!rzpKey || !rzpSecret) return res.status(400).json({ msg: 'Razorpay is not configured by the admin.' });

            const instance = new Razorpay({ key_id: rzpKey, key_secret: rzpSecret });
            
            // Amount in paise
            const amountPaise = Math.round(session.amount * 100);
            
            const options = {
                amount: amountPaise,
                currency: session.currency,
                receipt: session.transactionId
            };

            const order = await instance.orders.create(options);
            return res.json({
                gateway: 'razorpay',
                order_id: order.id,
                amount: order.amount,
                currency: order.currency,
                key: rzpKey,
                prefill: {
                    contact: session.answersData?.contactNumber || ''
                }
            });
        } 
        else if (session.gateway === 'stripe') {
            const stripeSecret = pgSettings.stripeSecret;
            if (!stripeSecret) return res.status(400).json({ msg: 'Stripe is not configured by the admin.' });

            const stripeClient = stripe(stripeSecret);
            
            const stripeSession = await stripeClient.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: [{
                    price_data: {
                        currency: session.currency.toLowerCase(),
                        product_data: {
                            name: `Form Submission #${session.transactionId}`,
                        },
                        unit_amount: Math.round(session.amount * 100),
                    },
                    quantity: 1,
                }],
                mode: 'payment',
                success_url: `http://localhost:5173/f/${session.formId}?session_id={CHECKOUT_SESSION_ID}&success=true`,
                cancel_url: `http://localhost:5173/f/${session.formId}?canceled=true`,
                client_reference_id: session.id
            });

            return res.json({
                gateway: 'stripe',
                url: stripeSession.url,
                sessionId: stripeSession.id
            });
        }
        else {
            // For PhonePe, Cashfree, returning mock URLs or specific integrations
            // To be implemented fully in production docs
            return res.json({
                gateway: session.gateway,
                msg: `Initiation for ${session.gateway} is ready.`,
                amount: session.amount,
                currency: session.currency
            });
        }

    } catch (err) {
        console.error('Checkout init error:', err);
        res.status(500).json({ msg: 'Error initializing checkout', error: err.message });
    }
});

// Finalize payment and fire all automations
router.post('/verify', async (req, res) => {
    const { sessionId, status, gatewayResponse } = req.body;
    try {
        const session = await PaymentSession.findOne({ where: { id: sessionId } });
        if (!session) return res.status(404).json({ msg: 'Session not found' });

        if (status === 'success') {
            // 1. Save the FormResponse
            const response = await FormResponse.create({
                formId: session.formId,
                contactNumber: session.answersData.contactNumber,
                answers: session.answersData.answers,
                ipAddress: session.answersData.ipAddress,
                status: 'paid',
                transactionId: session.transactionId,
                amountPaid: session.amount,
                currency: session.currency,
                gatewayUsed: session.gateway
            });

            await session.destroy(); // cleanup

            // 2. Fire automations (Fire & Forget — same as regular submit flow)
            const axios = require('axios');
            const form = await Form.findOne({ where: { id: response.formId } });

            console.log(`[CHECKOUT/VERIFY] Form found: ${!!form}, formId: ${response.formId}`);
            if (form) {
                const automation = form.automation || {};
                const contactNumber = response.contactNumber;
                const answers = response.answers;

                console.log(`[CHECKOUT/VERIFY] automation.whatsappEnabled=${automation.whatsappEnabled}, templateName=${automation.whatsappTemplate?.name}, contactNumber=${contactNumber}`);

                // Webhook
                if (automation.webhookUrl) {
                    axios.post(automation.webhookUrl, {
                        event: 'form_submitted',
                        formId: form.id,
                        formName: form.name,
                        contactNumber,
                        answers,
                        paymentStatus: 'paid',
                        amountPaid: response.amountPaid,
                        currency: response.currency,
                        submittedAt: response.createdAt
                    }).catch(e => console.error('[CHECKOUT] Webhook firing failed:', e.message));
                }

                // WhatsApp Template Automation
                if (automation.whatsappEnabled && automation.whatsappTemplate?.name && contactNumber) {
                    (async () => {
                        try {
                            const settings = await Settings.findOne({ where: { userId: form.userId } });
                            if (!settings || !settings.metaAccessToken || !settings.metaPhoneNumberId) return;

                            const mappings = automation.whatsappTemplate.mappings || {};
                            const components = [];

                            if (automation.whatsappTemplate.headerMediaId) {
                                const fileName = automation.whatsappTemplate.headerFileName || '';
                                const ext = fileName.split('.').pop().toLowerCase();
                                let mediaType = 'image';
                                if (['mp4', 'avi', 'mov'].includes(ext)) mediaType = 'video';
                                else if (['pdf', 'doc', 'docx'].includes(ext)) mediaType = 'document';
                                components.push({
                                    type: 'header',
                                    parameters: [{ type: mediaType, [mediaType]: { id: automation.whatsappTemplate.headerMediaId } }]
                                });
                            }

                            const bodyKeys = Object.keys(mappings).filter(k => k.startsWith('body_')).sort();
                            if (bodyKeys.length > 0) {
                                const bodyParams = bodyKeys.map(key => {
                                    const mapData = mappings[key];
                                    const mapObj = mapData && typeof mapData === 'object' ? mapData : { type: 'form_field', value: mapData };
                                    let finalValue = ' ';
                                    if (mapObj.type === 'custom') {
                                        finalValue = mapObj.value || ' ';
                                    } else {
                                        const answerValue = answers[mapObj.value];
                                        finalValue = Array.isArray(answerValue) ? answerValue.join(', ') : (typeof answerValue === 'object' && answerValue !== null ? Object.values(answerValue).join(', ') : String(answerValue || ' '));
                                    }
                                    return { type: 'text', text: finalValue || ' ' };
                                });
                                components.push({ type: 'body', parameters: bodyParams });
                            }

                            const buttonKeys = Object.keys(mappings).filter(k => k.startsWith('button_')).sort();
                            buttonKeys.forEach(key => {
                                const btnIdx = parseInt(key.replace('button_', ''), 10);
                                if (isNaN(btnIdx)) return;
                                const mapData = mappings[key];
                                const mapObj = mapData && typeof mapData === 'object' ? mapData : { type: 'form_field', value: mapData };
                                let finalValue = ' ';
                                if (mapObj.type === 'custom') {
                                    finalValue = mapObj.value || ' ';
                                } else {
                                    const answerValue = answers[mapObj.value];
                                    finalValue = Array.isArray(answerValue) ? answerValue.join(', ') : (typeof answerValue === 'object' && answerValue !== null ? Object.values(answerValue).join(', ') : String(answerValue || ' '));
                                }
                                components.push({
                                    type: 'button',
                                    sub_type: 'url',
                                    index: String(btnIdx),
                                    parameters: [{ type: 'text', text: finalValue || ' ' }]
                                });
                            });

                            // Carousel cards
                            const savedCards = automation.whatsappTemplate.cards;
                            if (savedCards && savedCards.length > 0) {
                                const carouselCards = savedCards.map((card) => {
                                    const cardComponents = [];
                                    if (card.headerMediaId) {
                                        const ext = (card.headerFileName || '').split('.').pop().toLowerCase();
                                        let mediaType = 'image';
                                        if (['mp4', 'avi', 'mov'].includes(ext)) mediaType = 'video';
                                        cardComponents.push({ type: 'header', parameters: [{ type: mediaType, [mediaType]: { id: card.headerMediaId } }] });
                                    }
                                    const cardBodyKeys = Object.keys(card).filter(k => k.startsWith('body_')).sort();
                                    if (cardBodyKeys.length > 0) {
                                        const cardBodyParams = cardBodyKeys.map(key => {
                                            const mapData = card[key];
                                            const mapObj = mapData && typeof mapData === 'object' ? mapData : { type: 'form_field', value: mapData };
                                            let finalValue = ' ';
                                            if (mapObj.type === 'custom') finalValue = mapObj.value || ' ';
                                            else {
                                                const answerValue = answers[mapObj.value];
                                                finalValue = Array.isArray(answerValue) ? answerValue.join(', ') : (typeof answerValue === 'object' && answerValue !== null ? Object.values(answerValue).join(', ') : String(answerValue || ' '));
                                            }
                                            return { type: 'text', text: finalValue || ' ' };
                                        });
                                        cardComponents.push({ type: 'body', parameters: cardBodyParams });
                                    }
                                    Object.keys(card).filter(k => k.startsWith('button_')).sort().forEach(key => {
                                        const btnIdx = parseInt(key.replace('button_', ''), 10);
                                        if (isNaN(btnIdx)) return;
                                        const mapData = card[key];
                                        const mapObj = mapData && typeof mapData === 'object' ? mapData : { type: 'form_field', value: mapData };
                                        let finalValue = ' ';
                                        if (mapObj.type === 'custom') finalValue = mapObj.value || ' ';
                                        else {
                                            const answerValue = answers[mapObj.value];
                                            finalValue = Array.isArray(answerValue) ? answerValue.join(', ') : (typeof answerValue === 'object' && answerValue !== null ? Object.values(answerValue).join(', ') : String(answerValue || ' '));
                                        }
                                        cardComponents.push({ type: 'button', sub_type: 'url', index: String(btnIdx), parameters: [{ type: 'text', text: finalValue || ' ' }] });
                                    });
                                    return { card_index: savedCards.indexOf(card), components: cardComponents };
                                });
                                components.push({ type: 'carousel', cards: carouselCards });
                            }

                            await axios.post(
                                `https://graph.facebook.com/v21.0/${settings.metaPhoneNumberId}/messages`,
                                {
                                    messaging_product: 'whatsapp',
                                    to: contactNumber.replace(/\D/g, ''),
                                    type: 'template',
                                    template: {
                                        name: automation.whatsappTemplate.name,
                                        language: { code: automation.whatsappTemplate.language || 'en_US' },
                                        components
                                    }
                                },
                                { headers: { Authorization: `Bearer ${settings.metaAccessToken}` } }
                            );
                            console.log(`[CHECKOUT] WhatsApp automation sent to ${contactNumber} after payment for form ${form.id}`);
                        } catch (err) {
                            console.error('[CHECKOUT] WhatsApp Automation Dispatch Failed:', err.response?.data || err.message);
                        }
                    })();
                }
            }

            return res.json({ msg: 'Payment verified and response saved.', responseId: response.id });
        } else {
            return res.status(400).json({ msg: 'Payment failed' });
        }
    } catch(err) {
        console.error('Verify error:', err);
        res.status(500).json({ msg: 'Server error' });
    }
});

module.exports = router;
