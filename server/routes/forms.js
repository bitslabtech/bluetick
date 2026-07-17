const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Form = require('../models/Form');
const FormResponse = require('../models/FormResponse');
const Settings = require('../models/Settings');
const PaymentSession = require('../models/PaymentSession');
const crypto = require('crypto');

const { Sequelize } = require('sequelize');

// 1. Get all forms for the authenticated user
router.get('/', auth, async (req, res) => {
    try {
        const forms = await Form.findAll({
            where: { userId: req.user.id },
            order: [['createdAt', 'DESC']],
            attributes: {
                include: [
                    [Sequelize.fn('COUNT', Sequelize.col('FormResponses.id')), 'submissionCount']
                ]
            },
            include: [{
                model: FormResponse,
                attributes: []
            }],
            group: ['Form.id']
        });
        res.json(forms);
    } catch (err) {
        console.error('Error fetching forms:', err);
        res.status(500).json({ msg: 'Server error' });
    }
});


// 2. Get a single form by ID (Public, for rendering the form)
router.get('/:id', async (req, res) => {
    try {
        const form = await Form.findOne({
            where: { id: req.params.id }
        });
        
        if (!form) return res.status(404).json({ msg: 'Form not found' });
        
        // If not published, do not show to public, unless requested via auth (skipped here for simplicity)
        if (!form.isPublished) return res.status(403).json({ msg: 'This form is no longer accepting responses.' });
        
        // Only increment view count if explicitly requested by tracking logic
        if (req.query.trackView === 'true') {
            form.views = (form.views || 0) + 1;
            await form.save();
        }

        // Fetch superadmin settings for branding (guarded — column may not exist yet)
        let appName = 'App';
        try {
            const User = require('../models/User');
            const Settings = require('../models/Settings');
            const superadmin = await User.findOne({ where: { role: 'superadmin' } });
            if (superadmin) {
                const settings = await Settings.findOne({ where: { userId: superadmin.id } });
                if (settings && settings.appName) appName = settings.appName;
            }
        } catch (brandingErr) {
            console.warn('Could not load branding settings:', brandingErr.message);
        }

        const formData = form.toJSON();
        formData.appName = appName;

        res.json(formData);
    } catch (err) {
        console.error('Error fetching form:', err);
        res.status(500).json({ msg: 'Server error' });
    }
});

// 3. Get a single form by ID (Admin/Owner view with responses)
router.get('/admin/:id', auth, async (req, res) => {
    try {
        const form = await Form.findOne({
            where: { id: req.params.id, userId: req.user.id },
            include: [{ model: FormResponse }]
        });
        
        if (!form) return res.status(404).json({ msg: 'Form not found' });
        res.json(form);
    } catch (err) {
        console.error('Error fetching form details:', err);
        res.status(500).json({ msg: 'Server error' });
    }
});

// 4. Create a new form
router.post('/', auth, async (req, res) => {
    const { name, description, fields, theme, isPublished, brandConfig, formLogic, automation, restrictions, paymentConfig } = req.body;
    try {
        const form = await Form.create({
            userId: req.user.id,
            name,
            description,
            fields: fields || [],
            theme: theme || 'light',
            isPublished: isPublished || false,
            brandConfig: brandConfig || {},
            formLogic: formLogic || {},
            automation: automation || {},
            restrictions: restrictions || {},
            paymentConfig: paymentConfig || {},
            views: 0
        });
        res.json(form);
    } catch (err) {
        console.error('Error creating form:', err);
        res.status(500).json({ msg: 'Server error' });
    }
});

// 5. Update a form
router.put('/:id', auth, async (req, res) => {
    const { name, description, fields, theme, isPublished, brandConfig, formLogic, automation, restrictions, paymentConfig } = req.body;
    try {
        const form = await Form.findOne({ where: { id: req.params.id, userId: req.user.id } });
        if (!form) return res.status(404).json({ msg: 'Form not found' });

        if (name !== undefined) form.name = name;
        if (description !== undefined) form.description = description;
        if (fields !== undefined) form.fields = fields;
        if (theme !== undefined) form.theme = theme;
        if (isPublished !== undefined) form.isPublished = isPublished;
        if (brandConfig !== undefined) form.brandConfig = brandConfig;
        if (formLogic !== undefined) form.formLogic = formLogic;
        if (automation !== undefined) form.automation = automation;
        if (restrictions !== undefined) form.restrictions = restrictions;
        if (paymentConfig !== undefined) form.paymentConfig = paymentConfig;

        await form.save();
        res.json(form);
    } catch (err) {
        console.error('Error updating form:', err);
        res.status(500).json({ msg: 'Server error' });
    }
});

// 6. Delete a form
router.delete('/:id', auth, async (req, res) => {
    try {
        const form = await Form.findOne({ where: { id: req.params.id, userId: req.user.id } });
        if (!form) return res.status(404).json({ msg: 'Form not found' });

        await form.destroy(); // Cascades and deletes responses
        res.json({ msg: 'Form deleted' });
    } catch (err) {
        console.error('Error deleting form:', err);
        res.status(500).json({ msg: 'Server error' });
    }
});

const axios = require('axios'); // For webhooks

// 7. Submit a form response (Public)
router.post('/submit/:id', async (req, res) => {
    const { contactNumber, answers } = req.body;
    try {
        const form = await Form.findOne({ where: { id: req.params.id } });
        if (!form) return res.status(404).json({ msg: 'Form not found' });
        if (!form.isPublished) return res.status(403).json({ msg: 'Form is closed.' });

        // --- 1. Restrictions validation ---
        const restrictions = form.restrictions || {};
        
        if (restrictions.closeDate && new Date() > new Date(restrictions.closeDate)) {
            return res.status(403).json({ msg: 'This form has expired and is no longer accepting responses.' });
        }

        if (restrictions.maxSubmissions) {
            const count = await FormResponse.count({ where: { formId: form.id } });
            if (count >= restrictions.maxSubmissions) {
                return res.status(403).json({ msg: 'This form has reached its maximum number of allowed responses.' });
            }
        }

        const { getRealIp } = require('../utils/ip');
        const ipAddress = getRealIp(req);
        if (restrictions.preventDuplicates) {
            // --- Primary: phone number dedup ---
            if (contactNumber) {
                const existingContact = await FormResponse.findOne({
                    where: { formId: form.id, contactNumber }
                });
                if (existingContact) {
                    return res.status(403).json({ msg: 'This phone number has already been used to submit a response to this form.' });
                }
            }

            // --- Secondary: email dedup (scan answers JSONB in JS) ---
            const submittedEmail = Object.values(answers || {}).find(
                v => typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())
            );
            if (submittedEmail) {
                const allResponses = await FormResponse.findAll({
                    where: { formId: form.id },
                    attributes: ['answers']
                });
                const emailAlreadyUsed = allResponses.some(r => {
                    const vals = Object.values(r.answers || {});
                    return vals.some(v => typeof v === 'string' && v.trim().toLowerCase() === submittedEmail.trim().toLowerCase());
                });
                if (emailAlreadyUsed) {
                    return res.status(403).json({ msg: 'This email address has already been used to submit a response.' });
                }
            }

            // --- Last resort: IP fallback (only when no phone/email present) ---
            if (!contactNumber && !submittedEmail) {
                const existingIp = await FormResponse.findOne({
                    where: { formId: form.id, ipAddress }
                });
                if (existingIp) {
                    return res.status(403).json({ msg: 'A response has already been submitted from your device.' });
                }
            }
        }

        // --- 1.5. Payment Processing Interception ---
        const paymentConfig = form.paymentConfig || {};
        if (paymentConfig.requirePayment) {
            let checkoutAmount = 0;
            if (paymentConfig.amountType === 'dynamic' && paymentConfig.dynamicFieldId) {
                const selectedValue = answers[paymentConfig.dynamicFieldId];
                if (selectedValue) {
                    const dynamicField = (form.fields || []).find(f => f.id === paymentConfig.dynamicFieldId);
                    if (dynamicField && dynamicField.optionPrices && dynamicField.optionPrices[selectedValue] !== undefined && dynamicField.optionPrices[selectedValue] !== '') {
                        checkoutAmount = parseFloat(dynamicField.optionPrices[selectedValue]);
                    } else {
                        const match = String(selectedValue).match(/(\d+(\.\d+)?)/);
                        if (match) checkoutAmount = parseFloat(match[1]);
                    }
                }
            } else {
                checkoutAmount = parseFloat(paymentConfig.fixedAmount || 0);
            }
            
            if (checkoutAmount > 0) {
                const settings = await Settings.findOne({ where: { userId: form.userId } });
                const pgSettings = settings?.paymentGateways || {};
                
                // Add 3% flat fee if 'pass to customer' is enabled
                if (pgSettings.transactionFeeRule === 'pass') {
                    checkoutAmount = checkoutAmount + (checkoutAmount * 0.03);
                    checkoutAmount = Math.ceil(checkoutAmount * 100) / 100;
                }
                
                const transactionId = 'txn_' + crypto.randomBytes(8).toString('hex');
                const gateway = paymentConfig.gatewayUsed || 'razorpay';
                const currency = paymentConfig.currency || 'INR';
                
                if (gateway === 'razorpay' && !pgSettings.razorpay?.keyId) {
                    return res.status(400).json({ msg: 'Payment Gateway (Razorpay) is not fully configured by the form owner.', paymentSetupIncomplete: true });
                }
                if (gateway === 'stripe' && !pgSettings.stripe?.publishableKey) {
                    return res.status(400).json({ msg: 'Payment Gateway (Stripe) is not fully configured by the form owner.', paymentSetupIncomplete: true });
                }
                
                // Let's generate a gateway-specific order/session right here instead of doing it later, 
                // but since Stripe/Razorpay require backend API calls to their servers, we can do it here.
                // For simplicity of phase 4, we generate the local session and return it to frontend. The frontend can then call a `/checkout/init` route, OR we can do it all here. 
                // Let's do it right here to save trips! But first, let's establish the PaymentSession record.
                
                const session = await PaymentSession.create({
                    formId: form.id,
                    gateway,
                    transactionId,
                    amount: checkoutAmount,
                    currency,
                    answersData: { contactNumber, answers, ipAddress },
                    expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 mins
                });
                
                return res.json({
                    msg: 'Payment required',
                    paymentRequired: true,
                    checkoutAmount,
                    currency,
                    gateway,
                    transactionId,
                    sessionId: session.id
                });
            }
        }

        // --- 2. Save Response ---
        const response = await FormResponse.create({
            formId: form.id,
            contactNumber: contactNumber || null,
            answers: answers || {},
            ipAddress,
            status: 'new'
        });

        // --- 3. Automation handling (Fire & Forget to not block user response) ---
        const automation = form.automation || {};
        
        if (automation.webhookUrl) {
            axios.post(automation.webhookUrl, {
                event: 'form_submitted',
                formId: form.id,
                formName: form.name,
                contactNumber,
                answers,
                submittedAt: response.createdAt
            }).catch(e => console.error("Webhook firing failed", e.message));
        }

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
                    if (buttonKeys.length > 0) {
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
                    }

                    // Build CAROUSEL component if cards are configured
                    const savedCards = automation.whatsappTemplate.cards;
                    if (savedCards && savedCards.length > 0) {
                        const carouselCards = savedCards.map((card) => {
                            const cardComponents = [];

                            // Card media header
                            if (card.headerMediaId) {
                                const ext = (card.headerFileName || '').split('.').pop().toLowerCase();
                                let mediaType = 'image';
                                if (['mp4', 'avi', 'mov'].includes(ext)) mediaType = 'video';
                                cardComponents.push({
                                    type: 'header',
                                    parameters: [{ type: mediaType, [mediaType]: { id: card.headerMediaId } }]
                                });
                            }

                            // Card body variables
                            const cardBodyKeys = Object.keys(card).filter(k => k.startsWith('body_')).sort();
                            if (cardBodyKeys.length > 0) {
                                const cardBodyParams = cardBodyKeys.map(key => {
                                    const mapData = card[key];
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
                                cardComponents.push({ type: 'body', parameters: cardBodyParams });
                            }

                            // Card buttons
                            const cardBtnKeys = Object.keys(card).filter(k => k.startsWith('button_')).sort();
                            cardBtnKeys.forEach(key => {
                                const btnIdx = parseInt(key.replace('button_', ''), 10);
                                if (isNaN(btnIdx)) return;
                                const mapData = card[key];
                                const mapObj = mapData && typeof mapData === 'object' ? mapData : { type: 'form_field', value: mapData };
                                let finalValue = ' ';
                                if (mapObj.type === 'custom') {
                                    finalValue = mapObj.value || ' ';
                                } else {
                                    const answerValue = answers[mapObj.value];
                                    finalValue = Array.isArray(answerValue) ? answerValue.join(', ') : (typeof answerValue === 'object' && answerValue !== null ? Object.values(answerValue).join(', ') : String(answerValue || ' '));
                                }
                                cardComponents.push({
                                    type: 'button',
                                    sub_type: 'url',
                                    index: String(btnIdx),
                                    parameters: [{ type: 'text', text: finalValue || ' ' }]
                                });
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
                } catch (err) {
                    console.error('WhatsApp Automation Template Dispatch Failed:', err.response?.data || err.message);
                }
            })();
        }

        res.json({ msg: 'Response submitted successfully', response });
    } catch (err) {
        console.error('Error submitting form response:', err);
        res.status(500).json({ msg: 'Server error' });
    }
});

// 8. Generate AI Form (Admin)
router.post('/generate-ai', auth, async (req, res) => {
    const { prompt } = req.body;
    try {
        if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

        const User = require('../models/User');
        const SystemConfig = require('../models/SystemConfig');
        const user = await User.findByPk(req.user.id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const sysConfig = await SystemConfig.getConfig();
        const multiplier = sysConfig?.settings?.aiTokenMultipliers?.ai_form_generator ?? 1;
        const BASE_COST = 10;
        const finalCost = Math.ceil(BASE_COST * multiplier);

        if (user.aiTokenBalance < finalCost) {
            return res.status(402).json({ error: `Insufficient AI tokens. Required: ${finalCost}` });
        }

        const { runAi } = require('../utils/aiRunner');

        const systemInstruction = `You are an expert web form builder. The user will ask for a type of form.
You MUST reply with ONLY a raw JSON object (no markdown, no backticks).
The JSON object must have this exact structure:
{
  "name": "A catchy, conversion-optimized name for the form",
  "description": "A brief, compelling description",
  "checkout": {
      "requirePayment": true, // only set to true if the prompt mentions a fee or price
      "amount": 650,          // the numeric amount
      "currency": "INR",      // the currency code like INR, USD, EUR
      "paymentType": "fixed"  
  },
  "fields": [
    {
      "id": "generate a random 7-char alphanumeric string for each field",
      "type": "one of: text, phone, email, number, select, radio, yesno, date, time, rating, file, image, address, signature",
      "label": "The question or field label",
      "required": true,
      "options": ["Opt 1", "Opt 2"] // ONLY include if type is 'select' or 'radio'
    }
  ]
}
Make sure to include all necessary fields for a high-converting form based on the user's prompt (e.g. Lead Gen, Customer Feedback, Event Registration). Include at least 4-5 well-thought-out fields. 
CRITICAL RULES:
1. If the user mentions any payment, fee, pricing, or checkout amount (e.g., "$50 fee" or "650rs registration"), DO NOT create a standard field for it. Instead, enable the "checkout" object as shown above, converting their stated price into the "amount". If no price is mentioned, omit the checkout object or set requirePayment to false.
2. Do not include markdown \`\`\`json wrappers in your output. Just output the raw JSON object string.`;

        const { text: formsRaw, modelUsed: formsModel } = await runAi(sysConfig, systemInstruction, prompt, { temperature: 0.7, maxOutputTokens: 2048 });
        console.log(`[Forms AI] used model: ${formsModel}`);
        let replyText = formsRaw.replace(/```json/gi, '').replace(/```/gi, '').trim();

        let generatedForm;
        try {
            generatedForm = JSON.parse(replyText);
        } catch (e) {
            console.error("Failed to parse Gemini output:", replyText);
            return res.status(500).json({ error: 'AI failed to generate a valid form structure.' });
        }

        await user.decrement('aiTokenBalance', { by: finalCost });
        const newBal = (user.aiTokenBalance - finalCost);

        // Log token usage event
        try {
            const AiTokenLog = require('../models/AiTokenLog');
            await AiTokenLog.create({
                userId: req.user.id,
                feature: 'ai_form_generator',
                tokensUsed: finalCost,
                balanceAfter: Math.max(0, newBal)
            });
        } catch (logErr) {
            console.warn('[FORMS AI] Failed to write AiTokenLog:', logErr.message);
        }

        res.json({
            formSetup: generatedForm,
            tokensDeducted: finalCost,
            newBalance: newBal
        });
    } catch (err) {
        console.error('Error generating AI form:', err.response?.data || err.message);
        res.status(500).json({ error: 'Failed to communicate with AI platform' });
    }
});

module.exports = router;
