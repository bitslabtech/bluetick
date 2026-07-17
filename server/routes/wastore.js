const express = require('express');
const router = express.Router();
const WaStore = require('../models/WaStore');
const WaProduct = require('../models/WaProduct');
const WaOrder = require('../models/WaOrder');
const User = require('../models/User');
const Plan = require('../models/Plan');
const AiTokenLog = require('../models/AiTokenLog');
const SystemConfig = require('../models/SystemConfig');
const auth = require('../middleware/auth');
const axios = require('axios');
const storageProvider = require('../utils/storageProvider');
const { deleteStorageFile } = require('../utils/storageProvider');
const { Op, fn, col, literal } = require('sequelize');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { fireCAPIEvent } = require('../utils/capi');

// ── CAPI helper: build order contents array from items ───────────────────────
const buildCAPIContents = (items = []) =>
    items.map(i => ({
        id: String(i.id || i.productId || ''),
        quantity: i.qty || i.quantity || 1,
        item_price: parseFloat(i.price || 0),
        title: i.name || '',
    }));

// ── CAPI helper: fire InitiateCheckout for a newly created order ─────────────
const fireCAPICheckout = async (store, order) => {
    try {
        const storeOwner = await User.findByPk(store.userId, { attributes: ['capiConfig', 'metaAdsToken'] });
        if (!storeOwner) return;
        const pixelId     = storeOwner.capiConfig?.pixelId;
        const accessToken = storeOwner.capiConfig?.accessToken || storeOwner.metaAdsToken;
        if (!pixelId || !accessToken) return;

        await fireCAPIEvent({
            pixelId,
            accessToken,
            eventName: 'InitiateCheckout',
            sourceUrl: `${process.env.APP_URL || ''}/store/${store.slug}`,
            userData: { phone: order.customerPhone, email: order.customerEmail },
            testEventCode: storeOwner.capiConfig?.testEventCode,
            eventData: {
                value: parseFloat(order.total || order.subtotal || 0),
                currency: order.currency || store.currency || 'INR',
                num_items: (order.items || []).reduce((s, i) => s + (i.qty || 1), 0),
                contents: buildCAPIContents(order.items),
                order_id: order.orderNumber,
            },
        });
    } catch (e) { console.warn('[CAPI][InitiateCheckout] Non-blocking error:', e.message); }
};

// ── CAPI helper: fire Purchase when order is confirmed ───────────────────────
const fireCAPIPurchase = async (store, order) => {
    try {
        const storeOwner = await User.findByPk(store.userId, { attributes: ['capiConfig', 'metaAdsToken'] });
        if (!storeOwner) return;
        const pixelId     = storeOwner.capiConfig?.pixelId;
        const accessToken = storeOwner.capiConfig?.accessToken || storeOwner.metaAdsToken;
        if (!pixelId || !accessToken) return;

        await fireCAPIEvent({
            pixelId,
            accessToken,
            eventName: 'Purchase',
            sourceUrl: `${process.env.APP_URL || ''}/store/${store.slug}`,
            userData: { phone: order.customerPhone, email: order.customerEmail },
            testEventCode: storeOwner.capiConfig?.testEventCode,
            eventData: {
                value: parseFloat(order.total || order.subtotal || 0),
                currency: order.currency || store.currency || 'INR',
                num_items: (order.items || []).reduce((s, i) => s + (i.qty || 1), 0),
                contents: buildCAPIContents(order.items),
                order_id: order.orderNumber,
            },
        });
    } catch (e) { console.warn('[CAPI][Purchase] Non-blocking error:', e.message); }
};

// ==========================================
// PUBLIC ROUTES
// ==========================================

// Get Public Store by slug
router.get('/public/:slug', async (req, res) => {
    try {
        const slug = req.params.slug.toLowerCase();
        
        // Prevent browser caching so theme and layout changes reflect immediately
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');

        const store = await WaStore.findOne({
            where: { slug, isActive: true }
        });

        if (!store) {
            return res.status(404).json({ error: 'Store not found or inactive' });
        }

        const owner = await User.findByPk(store.userId, {
            attributes: ['id', 'plan', 'planStatus']
        });

        if (!owner || owner.planStatus !== 'Active') {
            return res.status(403).json({ error: 'This store is currently unavailable.' });
        }

        // Fetch owner's plan limit/access
        const ownerPlan = await Plan.findOne({ where: { name: owner.plan } });
        if (!ownerPlan || !ownerPlan.allowWaStore) {
             return res.status(403).json({ error: 'This store is currently unavailable due to plan restrictions.' });
        }

        // ⚠️ View increment moved to dedicated POST /public/:slug/view endpoint
        // to prevent double-counting from React StrictMode / multiple re-renders

        // Fetch products — if showOutOfStock is enabled, include out-of-stock products
        // so the frontend shows them with an "Out of Stock" badge; otherwise only return in-stock
        const showOutOfStock = store.inventoryConfig?.showOutOfStock === true;
        const products = await WaProduct.findAll({
            where: showOutOfStock
                ? { storeId: store.id }
                : { storeId: store.id, inStock: true }
        });

        const responseData = store.toJSON();
        delete responseData.User; // Hide user obj

        res.json({ store: responseData, products });
    } catch (error) {
        console.error("Fetch Public Store error:", error);
        res.status(500).json({ error: 'Server error fetching store' });
    }
});

// POST /api/wastore/public/:slug/view  — Dedicated view counter (called once per session from frontend)
router.post('/public/:slug/view', async (req, res) => {
    try {
        const store = await WaStore.findOne({ where: { slug: req.params.slug.toLowerCase(), isActive: true } });
        if (!store) return res.status(404).json({ error: 'Store not found' });
        await store.increment('views');
        res.json({ ok: true });
    } catch (error) {
        console.error('View increment error:', error);
        res.status(500).json({ error: 'Failed to record view' });
    }
});


// Get Public Store by Domain
router.get('/public/domain/:domain', async (req, res) => {
    try {
        const { domain } = req.params;

        // Prevent browser caching
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');

        const store = await WaStore.findOne({
            where: { customDomain: domain, isActive: true }
        });

        if (!store) {
            return res.status(404).json({ error: 'Store not found or inactive' });
        }

        const owner = await User.findByPk(store.userId, {
            attributes: ['id', 'plan', 'planStatus']
        });

        if (!owner || owner.planStatus !== 'Active') {
            return res.status(403).json({ error: 'This store is currently unavailable.' });
        }

        // Fetch owner's plan limit/access
        const ownerPlan = await Plan.findOne({ where: { name: owner.plan } });
        if (!ownerPlan || !ownerPlan.allowWaStore) {
             return res.status(403).json({ error: 'This store is currently unavailable due to plan restrictions.' });
        }

        // ⚠️ View increment handled by POST /public/:slug/view (called once per session)

        // Fetch products — if showOutOfStock is enabled, include out-of-stock products
        // so the frontend shows them with an "Out of Stock" badge; otherwise only return in-stock
        const showOutOfStock = store.inventoryConfig?.showOutOfStock === true;
        const products = await WaProduct.findAll({
            where: showOutOfStock
                ? { storeId: store.id }
                : { storeId: store.id, inStock: true }
        });

        const responseData = store.toJSON();
        delete responseData.User; // Hide user obj

        res.json({ store: responseData, products });
    } catch (error) {
        console.error("Fetch Public Store Domain error:", error);
        res.status(500).json({ error: 'Server error fetching store by domain' });
    }
});

// POST /api/wastore/orders  — Public: record a new order (called from storefront before WhatsApp redirect)
router.post('/orders', async (req, res) => {
    try {
        const { storeId, customerName, customerPhone, customerEmail, customerAddress, customerNote, items, subtotal, originalTotal, discountAmount, couponCode, currency, taxAmount, taxRate, taxName, total } = req.body;

        if (!storeId || !items || !subtotal) {
            return res.status(400).json({ error: 'Missing required order fields' });
        }

        const store = await WaStore.findByPk(storeId);
        if (!store || !store.isActive) return res.status(404).json({ error: 'Store not found' });

        // Generate human-readable order number
        const prefixOnline = store.invoiceConfig?.prefixOnline || 'ORD-';
        const startSeq = parseInt(store.invoiceConfig?.startingNumber) || 1001;
        const count = await WaOrder.count({ where: { storeId } });
        const orderNumber = `${prefixOnline}${String(count + startSeq).padStart(4, '0')}`;

        const order = await WaOrder.create({
            storeId, orderNumber,
            customerName, customerPhone, customerEmail, customerAddress, customerNote,
            items, subtotal, currency: currency || store.currency,
            originalTotal: originalTotal || null,
            discountAmount: parseFloat(discountAmount) || 0,
            couponCode: couponCode || null,
            taxAmount: parseFloat(taxAmount) || 0,
            total: parseFloat(total) || subtotal,
            status: 'pending'
        });

        // Deduct inventory
        if (items && Array.isArray(items)) {
            for (const item of items) {
                const product = await WaProduct.findByPk(item.id);
                if (product && product.trackQuantity) {
                    const deduction = item.qty || 1;
                    const newQty = (product.stockQuantity || 0) - deduction;
                    product.stockQuantity = newQty;
                    if (store.inventoryConfig?.autoOutOfStock && newQty <= 0) {
                        product.inStock = false;
                    }
                    await product.save();
                }
            }
        }

        // If checkout mode is gateway, initialize payment
        if (store.checkoutMode === 'gateway') {
            try {
                if (store.paymentProvider === 'razorpay') {
                const Razorpay = require('razorpay');
                const rzp = new Razorpay({
                    key_id: store.paymentConfig?.razorpayKeyId,
                    key_secret: store.paymentConfig?.razorpayKeySecret
                });

                const amountPaise = Math.round(order.subtotal * 100);
                const rzpOrder = await rzp.orders.create({
                    amount: amountPaise,
                    currency: order.currency || 'INR',
                    receipt: order.orderNumber
                });

                return res.json({
                    order,
                    orderNumber,
                    gatewayOptions: {
                        provider: 'razorpay',
                        keyId: store.paymentConfig?.razorpayKeyId,
                        amount: rzpOrder.amount,
                        currency: rzpOrder.currency,
                        orderId: rzpOrder.id
                    }
                });
            } else if (store.paymentProvider === 'phonepe') {
                const crypto = require('crypto');
                const merchantId = store.paymentConfig?.phonepeMerchantId;
                const saltKey = store.paymentConfig?.phonepeSaltKey;
                const saltIndex = store.paymentConfig?.phonepeSaltIndex || '1';

                const payload = {
                    merchantId: merchantId,
                    merchantTransactionId: order.orderNumber,
                    merchantUserId: customerPhone.replace(/\D/g, '') || 'USER123',
                    amount: Math.round(order.subtotal * 100),
                    // Redirect back to the store
                    redirectUrl: `${process.env.APP_URL || 'http://localhost:5173'}/store/${store.slug}/verify?order=${order.orderNumber}`,
                    redirectMode: "POST",
                    callbackUrl: `${process.env.APP_URL || 'http://localhost:5000'}/api/wastore/public/${store.slug}/phonepe-callback`,
                    mobileNumber: customerPhone.replace(/\D/g, ''),
                    paymentInstrument: {
                        type: "PAY_PAGE"
                    }
                };

                const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');
                const checksum = crypto.createHash('sha256').update(base64Payload + "/pg/v1/pay" + saltKey).digest('hex') + "###" + saltIndex;

                const phonePeEndpoint = (process.env.NODE_ENV === 'production') 
                    ? "https://api.phonepe.com/apis/hermes/pg/v1/pay" 
                    : "https://api-preprod.phonepe.com/apis/pg-sandbox/pg/v1/pay";

                const response = await axios.post(phonePeEndpoint, { request: base64Payload }, {
                    headers: { 'Content-Type': 'application/json', 'X-VERIFY': checksum }
                });

                return res.json({
                    order,
                    orderNumber,
                    gatewayOptions: {
                        provider: 'phonepe',
                        redirectUrl: response.data?.data?.instrumentResponse?.redirectInfo?.url
                    }
                });
            }
        } catch (pgError) {
            console.error('Gateway initialization error:', pgError);
            return res.status(500).json({ error: 'Payment gateway is not setup, please contact store owner.' });
        }
        }

        // ── Fire CAPI InitiateCheckout (non-blocking) ─────────────────────────
        fireCAPICheckout(store, order).catch(() => {});

        // ── Fire order_placed notification (non-blocking) ─────────────────────
        User.findByPk(store.userId).then(storeUser => {
            if (storeUser) sendOrderNotification('order_placed', store, storeUser, order).catch(() => {});
        }).catch(() => {});

        res.json({ order, orderNumber });
    } catch (error) {
        console.error('Create order error:', error);
        res.status(500).json({ error: 'Failed to create order' });
    }
});

async function sendWhatsAppInvoiceHelper(store, user, order, customerName, customerPhone) {
    if (!user.fbAccessToken || !user.metaPhoneNumberId) return;
    try {
        const { generateInvoicePdf } = require('../utils/invoiceGenerator');
        const fs = require('fs');
        const path = require('path');
        const axios = require('axios');
        const FormData = require('form-data');
        
        const invoicesDir = path.join(__dirname, '..', 'public', 'uploads', 'invoices');
        if (!fs.existsSync(invoicesDir)) fs.mkdirSync(invoicesDir, { recursive: true });
        
        const fileName = `invoice_${order.orderNumber}.pdf`;
        const filePath = path.join(invoicesDir, fileName);
        
        // Format WhatsApp number (strip + or anything non-numeric)
        let phone = customerPhone.replace(/\D/g, '');
        
        await generateInvoicePdf(
            { orderNumber: order.orderNumber, items: order.items, subtotal: order.subtotal, taxAmount: order.taxAmount, total: order.total, taxName: order.taxName, taxRate: order.taxRate },
            { name: store.name, currency: store.currency || 'USD', contactEmail: user.email, contactPhone: user.phone },
            { name: customerName, phone: customerPhone },
            filePath
        );

        const form = new FormData();
        form.append('file', fs.createReadStream(filePath));
        form.append('type', 'document');
        form.append('messaging_product', 'whatsapp');

        const uploadRes = await axios.post(`https://graph.facebook.com/v21.0/${user.metaPhoneNumberId}/media`, form, {
            headers: {
                ...form.getHeaders(),
                'Authorization': `Bearer ${user.fbAccessToken}`
            }
        });

        const mediaId = uploadRes.data.id;

        await axios.post(`https://graph.facebook.com/v21.0/${user.metaPhoneNumberId}/messages`, {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: phone,
            type: 'document',
            document: {
                id: mediaId,
                filename: `Invoice_${order.orderNumber}.pdf`,
                caption: `Hi ${customerName},\n\nThank you for your purchase at ${store.name}! Attached is your invoice for Order ${order.orderNumber}.`
            }
        }, {
            headers: { 'Authorization': `Bearer ${user.fbAccessToken}`, 'Content-Type': 'application/json' }
        });
    } catch (err) {
        console.error("Failed to generate/send invoice:", err.response?.data || err.message);
    }
}

// ── Order Notification Helper ─────────────────────────────────────────────────
// Fires the configured approved template notification for a given trigger key.
// Variable mapping (positional): the template is expected to use {{1}}, {{2}}, etc.
// The order of values injected matches the TRIGGERS definition in WaStoreNotifications.jsx:
//   order_placed/payment_received: name, orderNum, storeName, total
//   order_confirmed/processing/delivered/cancelled: name, orderNum, storeName
//   order_shipped: name, orderNum, storeName, trackingProvider, trackingUrl
async function sendOrderNotification(triggerKey, store, user, order, extras = {}) {
    try {
        const notifConfig = store.notificationTemplates?.[triggerKey];
        if (!notifConfig?.enabled) return;
        if (!notifConfig?.templateId) return; // must have a template selected
        if (!order.customerPhone) return;
        if (!user?.fbAccessToken || !user?.metaPhoneNumberId) return;

        // Validate and normalize phone — must have at least 7 digits
        const phone = order.customerPhone.replace(/\D/g, '');
        if (phone.length < 7) {
            console.warn(`[OrderNotif] Skipping ${triggerKey}: invalid phone "${order.customerPhone}"`);
            return;
        }

        const customerName = order.customerName || 'Customer';
        const storeName = store.name || 'Our Store';
        const orderNumber = order.orderNumber || '';
        const orderTotal = order.total != null
            ? `${order.currency || ''} ${Number(order.total).toFixed(2)}`.trim()
            : (order.subtotal != null ? `${order.currency || ''} ${Number(order.subtotal).toFixed(2)}`.trim() : '');
        const trackingProvider = extras.trackingProvider || order.trackingProvider || '';
        const trackingUrl = extras.trackingUrl || order.trackingUrl || '';

        // Map trigger → ordered list of positional variable values ({{1}}, {{2}}, ...)
        const variableMap = {
            order_placed:      [customerName, orderNumber, storeName, orderTotal],
            order_confirmed:   [customerName, orderNumber, storeName],
            order_processing:  [customerName, orderNumber, storeName],
            order_shipped:     [customerName, orderNumber, storeName, trackingProvider, trackingUrl],
            order_delivered:   [customerName, orderNumber, storeName],
            order_cancelled:   [customerName, orderNumber, storeName],
            payment_received:  [customerName, orderNumber, storeName, orderTotal],
        };
        const variableValues = variableMap[triggerKey] || [customerName, orderNumber, storeName];

        const Template = require('../models/Template');
        const tmpl = await Template.findByPk(notifConfig.templateId);
        if (!tmpl || tmpl.status !== 'APPROVED') {
            console.warn(`[OrderNotif] Template ${notifConfig.templateId} not found or not APPROVED for trigger ${triggerKey}`);
            return;
        }

        // Build body component parameters from template content variables ({{1}}, {{2}}, ...)
        // We count how many positional variables exist in the template content
        const variableMatches = (tmpl.content || '').match(/\{\{\d+\}\}/g) || [];
        const numVars = variableMatches.length;

        const components = [];
        if (numVars > 0) {
            const parameters = variableValues.slice(0, numVars).map(val => ({
                type: 'text',
                text: String(val || '')
            }));
            components.push({ type: 'body', parameters });
        }

        await axios.post(`https://graph.facebook.com/v21.0/${user.metaPhoneNumberId}/messages`, {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: phone,
            type: 'template',
            template: {
                name: tmpl.name,
                language: { code: tmpl.language || 'en_US' },
                components
            }
        }, {
            headers: { 'Authorization': `Bearer ${user.fbAccessToken}`, 'Content-Type': 'application/json' }
        });

        console.log(`[OrderNotif] Sent ${triggerKey} notification to ${phone} (template: ${tmpl.name})`);
    } catch (err) {
        console.error(`[OrderNotif] Failed to send ${triggerKey} notification:`, err.response?.data || err.message);
    }
}

// POST /api/wastore/:storeId/orders/pos — Create Offline POS Order & Send Invoice
router.post('/:storeId/orders/pos', auth, async (req, res) => {
    try {
        const { customerName, customerPhone, items, subtotal, taxAmount, total, taxRate, taxName, sendInvoice } = req.body;
        
        const store = await WaStore.findOne({ where: { id: req.params.storeId, userId: req.user.id } });
        if (!store) return res.status(404).json({ error: 'Store not found' });
        
        const user = await User.findByPk(req.user.id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        
        const prefixPos = store.invoiceConfig?.prefixPos || 'POS-';
        const startSeq = parseInt(store.invoiceConfig?.startingNumber) || 1001;
        const count = await WaOrder.count({ where: { storeId } });
        const orderNumber = `${prefixPos}${String(count + startSeq).padStart(4, '0')}`;

        const order = await WaOrder.create({
            storeId: store.id,
            orderNumber,
            customerName,
            customerPhone,
            items,
            subtotal,
            taxAmount,
            taxRate,
            taxName,
            total,
            currency: store.currency || 'USD',
            status: 'delivered', // POS is instantly delivered
            source: 'pos'
        });

        // Deduct inventory
        if (items && Array.isArray(items)) {
            for (const item of items) {
                const product = await WaProduct.findByPk(item.id);
                if (product && product.trackQuantity) {
                    const deduction = item.qty || 1;
                    const newQty = (product.stockQuantity || 0) - deduction;
                    product.stockQuantity = newQty;
                    if (store.inventoryConfig?.autoOutOfStock && newQty <= 0) {
                        product.inStock = false;
                    }
                    await product.save();
                }
            }
        }

        if (sendInvoice && user.fbAccessToken && user.metaPhoneNumberId) {
            await sendWhatsAppInvoiceHelper(store, user, order, customerName, customerPhone);
        }

        res.json({ order, orderNumber });
    } catch (error) {
        console.error('POS order error:', error);
        res.status(500).json({ error: 'Failed to process POS order' });
    }
});

// POST /api/wastore/public/:slug/verify-payment  — Public: verify gateway payment
router.post('/public/:slug/verify-payment', async (req, res) => {
    try {
        const { orderNumber, paymentData, provider } = req.body;
        const store = await WaStore.findOne({ where: { slug: req.params.slug.toLowerCase(), isActive: true } });
        if (!store) return res.status(404).json({ error: 'Store not found' });

        const order = await WaOrder.findOne({ where: { orderNumber, storeId: store.id } });
        if (!order) return res.status(404).json({ error: 'Order not found' });

        if (provider === 'razorpay') {
            const crypto = require('crypto');
            const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = paymentData;
            
            const body = razorpay_order_id + "|" + razorpay_payment_id;
            const expectedSignature = crypto
                .createHmac('sha256', store.paymentConfig?.razorpayKeySecret || '')
                .update(body.toString())
                .digest('hex');
                
            if (expectedSignature === razorpay_signature) {
                order.status = 'confirmed';
                order.notes = (order.notes ? order.notes + '\n' : '') + `Payment ID: ${razorpay_payment_id}`;
                await order.save();

                const storeUser = await User.findByPk(store.userId);
                if (storeUser) {
                    if (store.taxConfig?.autoSendInvoice) {
                        await sendWhatsAppInvoiceHelper(store, storeUser, order, order.customerName, order.customerPhone);
                    }
                    // ── Fire payment_received notification (non-blocking) ─────
                    sendOrderNotification('payment_received', store, storeUser, order).catch(() => {});
                }

                // ── Fire CAPI Purchase event (non-blocking) ───────────────────
                fireCAPIPurchase(store, order).catch(() => {});
                
                return res.json({ success: true, order });
            } else {
                return res.status(400).json({ error: 'Invalid payment signature' });
            }
        }
        
        // Handle PhonePe callback if needed, but phonepe-callback endpoint handles S2S
        if (provider === 'phonepe-check') {
             // For PhonePe we can check the status API
             const crypto = require('crypto');
             const merchantId = store.paymentConfig?.phonepeMerchantId;
             const saltKey = store.paymentConfig?.phonepeSaltKey;
             const saltIndex = store.paymentConfig?.phonepeSaltIndex || '1';

             const checksum = crypto.createHash('sha256').update(`/pg/v1/status/${merchantId}/${orderNumber}` + saltKey).digest('hex') + "###" + saltIndex;
             
             const statusEndpoint = (process.env.NODE_ENV === 'production')
                ? `https://api.phonepe.com/apis/hermes/pg/v1/status/${merchantId}/${orderNumber}`
                : `https://api-preprod.phonepe.com/apis/pg-sandbox/pg/v1/status/${merchantId}/${orderNumber}`;
                
             const response = await axios.get(statusEndpoint, {
                 headers: {
                     'Content-Type': 'application/json',
                     'X-VERIFY': checksum,
                     'X-MERCHANT-ID': merchantId
                 }
             });
             
             if (response.data.code === 'PAYMENT_SUCCESS') {
                 order.status = 'confirmed';
                 order.notes = (order.notes ? order.notes + '\n' : '') + `PhonePe Txn: ${response.data.data.transactionId}`;
                 await order.save();

                 const storeUser = await User.findByPk(store.userId);
                 if (storeUser) {
                     if (store.taxConfig?.autoSendInvoice) {
                         await sendWhatsAppInvoiceHelper(store, storeUser, order, order.customerName, order.customerPhone);
                     }
                     // ── Fire payment_received notification (non-blocking) ─────
                     sendOrderNotification('payment_received', store, storeUser, order).catch(() => {});
                 }

                 // ── Fire CAPI Purchase event (non-blocking) ───────────────────
                 fireCAPIPurchase(store, order).catch(() => {});

                 return res.json({ success: true, order });
             } else {
                 return res.json({ success: false, status: response.data.code });
             }
        }

        res.status(400).json({ error: 'Unknown provider' });
    } catch (error) {
        console.error('Verify payment error:', error);
        res.status(500).json({ error: 'Failed to verify payment' });
    }
});

// POST /api/wastore/public/:slug/phonepe-callback
router.post('/public/:slug/phonepe-callback', async (req, res) => {
    try {
        const { response } = req.body;
        if (!response) return res.status(400).send('No response');
        
        const decoded = JSON.parse(Buffer.from(response, 'base64').toString('utf-8'));
        const orderNumber = decoded.data.merchantTransactionId;
        
        const store = await WaStore.findOne({ where: { slug: req.params.slug, isActive: true } });
        if (!store) return res.status(404).send('Store not found');
        
        const order = await WaOrder.findOne({ where: { orderNumber, storeId: store.id } });
        if (order && decoded.code === 'PAYMENT_SUCCESS') {
            order.status = 'confirmed';
            await order.save();
        }
        res.send('OK');
    } catch (error) {
        console.error('PhonePe callback error:', error);
        res.status(500).send('Error');
    }
});



// ==========================================
// PROTECTED USER ROUTES
// ==========================================
router.use(auth);

// POST /api/wastore/ai-description — Generate AI product description
router.post('/ai-description', async (req, res) => {
    try {
        const { productName, keywords } = req.body;
        if (!productName) return res.status(400).json({ error: 'Product name is required' });

        const user = await User.findByPk(req.user.id);
        const tokensNeeded = 100; // Arbitrary cost for product description

        if (user.aiTokenBalance < tokensNeeded) {
            // 🚨 WA ADMIN NOTIFICATION - AI TOKENS DEPLETED
            try {
                const { sendAdminAlert } = require('../services/systemMessenger');
                await sendAdminAlert('ai_tokens_depleted', `${user.name} ran out of AI tokens`, { name: user.name });
            } catch (waErr) { console.error('[WA ALERT] ai_tokens_depleted failed:', waErr.message); }
            return res.status(403).json({ error: 'Insufficient AI tokens. Please upgrade or top up.' });
        }

        const { runAi } = require('../utils/aiRunner');
        const SystemConfig = require('../models/SystemConfig');
        const sysConfigForAi = await SystemConfig.getCachedConfig();

        let prompt = `Write an engaging, SEO-friendly product description for an online store product named "${productName}".\n`;
        if (keywords) {
            prompt += `Please include these keywords naturally: ${keywords}.\n`;
        }
        prompt += `Keep it professional, compelling, and around 2-3 paragraphs. Emphasize benefits. Don't add markdown formatting like asterisks.`;

        const systemInstruction = `You are an expert e-commerce copywriter. Write a compelling product description without markdown.`;
        const { text: aiText, modelUsed: aiModel1 } = await runAi(sysConfigForAi, systemInstruction, prompt, { temperature: 0.7, maxOutputTokens: 600 });
        console.log(`[WaStore AI] description used model: ${aiModel1}`);
        const description = aiText.trim();

        // Deduct Tokens
        user.aiTokenBalance -= tokensNeeded;
        await user.save();

        await AiTokenLog.create({
            userId: req.user.id,
            tokensUsed: tokensNeeded,
            feature: 'ai_store_copilot',
            description: `Generated product description for "${productName}"`
        });

        res.json({ description, tokensDeducted: tokensNeeded });

    } catch (error) {
        console.error('AI Gen error:', error);
        res.status(500).json({ error: 'Failed to generate AI description' });
    }
});

// POST /api/wastore/upload/logo  — Upload store logo image
router.post('/upload/logo', storageProvider('wastore-logos', { fileFilter: storageProvider.generalImageFilter, convertToWebp: true, trackMedia: true, mediaSource: 'wastore' }).single('logo'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
        res.json({ url: req.file.publicUrl });
    } catch (error) {
        console.error('Store logo upload error:', error);
        res.status(500).json({ error: 'Upload failed' });
    }
});

// POST /api/wastore/upload/seo  — Upload SEO og:image
router.post('/upload/seo', storageProvider('wastore-seo', { fileFilter: storageProvider.generalImageFilter, convertToWebp: true, trackMedia: true, mediaSource: 'wastore' }).single('image'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
        res.json({ url: req.file.publicUrl });
    } catch (error) {
        console.error('Store SEO upload error:', error);
        res.status(500).json({ error: 'Upload failed' });
    }
});

// POST /api/wastore/upload/cover  — Upload store cover image
router.post('/upload/cover', storageProvider('wastore-covers', { fileFilter: storageProvider.generalImageFilter, convertToWebp: true, trackMedia: true, mediaSource: 'wastore' }).single('cover'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
        res.json({ url: req.file.publicUrl });
    } catch (error) {
        console.error('Store cover upload error:', error);
        res.status(500).json({ error: 'Upload failed' });
    }
});

// POST /api/wastore/upload/slide  — Upload a hero slider image
router.post('/upload/slide', storageProvider('wastore-slides', { fileFilter: storageProvider.generalImageFilter, convertToWebp: true, trackMedia: true, mediaSource: 'wastore' }).single('slide'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
        res.json({ url: req.file.publicUrl });
    } catch (error) {
        console.error('Store slide upload error:', error);
        res.status(500).json({ error: 'Upload failed' });
    }
});

// POST /api/wastore/upload/product  — Upload a product image
router.post('/upload/product', storageProvider('wastore-products', { fileFilter: storageProvider.generalImageFilter, convertToWebp: true, trackMedia: true, mediaSource: 'wastore' }).single('product'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
        res.json({ url: req.file.publicUrl });
    } catch (error) {
        console.error('Product image upload error:', error);
        res.status(500).json({ error: 'Upload failed' });
    }
});

// POST /api/wastore/upload/category  — Upload a category image
router.post('/upload/category', storageProvider('wastore-categories', { fileFilter: storageProvider.generalImageFilter, convertToWebp: true, trackMedia: true, mediaSource: 'wastore' }).single('category'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
        res.json({ url: req.file.publicUrl });
    } catch (error) {
        console.error('Category image upload error:', error);
        res.status(500).json({ error: 'Upload failed' });
    }
});

// Get all stores for logged in user
router.get('/', async (req, res) => {
    try {
        const stores = await WaStore.findAll({
            where: { userId: req.user.id },
            order: [['createdAt', 'DESC']]
        });
        res.json(stores);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch stores' });
    }
});

// Create new store
router.post('/', async (req, res) => {
    try {
        // Enforce Plan Limits
        const userPlan = await Plan.findOne({ where: { name: req.user.plan } });
        if (!userPlan || !userPlan.allowWaStore) {
            return res.status(403).json({ error: 'Your current plan does not support WhatsApp Stores' });
        }

        const currentCount = await WaStore.count({ where: { userId: req.user.id } });
        if (userPlan.waStoreLimit > 0 && currentCount >= userPlan.waStoreLimit) {
            return res.status(403).json({ error: `Plan limit reached. You can only create ${userPlan.waStoreLimit} stores.` });
        }

        // Validate Slug uniqueness
        const { slug } = req.body;
        if (!slug) return res.status(400).json({ error: 'Slug is required' });

        const existingSlug = await WaStore.findOne({ where: { slug } });
        if (existingSlug) {
            return res.status(400).json({ error: 'This URL slug is already taken.' });
        }

        const newStore = await WaStore.create({
            ...req.body,
            userId: req.user.id
        });

        res.status(201).json(newStore);
    } catch (error) {
        console.error("Create store error:", error);
        res.status(500).json({ error: 'Failed to create store' });
    }
});

// Update store
router.put('/:id', async (req, res) => {
    try {
        const store = await WaStore.findOne({
            where: { id: req.params.id, userId: req.user.id }
        });
        if (!store) return res.status(404).json({ error: 'Store not found' });

        // If trying to change slug, check uniqueness
        if (req.body.slug && req.body.slug !== store.slug) {
            const existingSlug = await WaStore.findOne({ where: { slug: req.body.slug } });
            if (existingSlug) {
                return res.status(400).json({ error: 'This URL slug is already taken.' });
            }
        }

        const updates = { ...req.body };
        delete updates.id;
        delete updates.userId;
        delete updates.createdAt;
        delete updates.updatedAt;

        // ── Delete replaced store-level images from storage (fire-and-forget) ──

        // Logo replaced or removed
        if (store.logo && updates.logo !== undefined && updates.logo !== store.logo) {
            deleteStorageFile(store.logo).catch(() => {});
        }
        // Cover image replaced or removed
        if (store.coverImage && updates.coverImage !== undefined && updates.coverImage !== store.coverImage) {
            deleteStorageFile(store.coverImage).catch(() => {});
        }
        // SEO og:image replaced or removed
        if (store.seoImage && updates.seoImage !== undefined && updates.seoImage !== store.seoImage) {
            deleteStorageFile(store.seoImage).catch(() => {});
        }

        // Hero slides — find slide imageUrls that were removed or replaced
        if (updates.heroSlides !== undefined) {
            try {
                const oldSlides = Array.isArray(store.heroSlides) ? store.heroSlides : [];
                const newSlides = Array.isArray(updates.heroSlides) ? updates.heroSlides : [];
                const newUrls = new Set(newSlides.map(s => s?.imageUrl).filter(Boolean));
                oldSlides.forEach(slide => {
                    if (slide?.imageUrl && !newUrls.has(slide.imageUrl)) {
                        deleteStorageFile(slide.imageUrl).catch(() => {});
                    }
                });
            } catch (e) {}
        }

        // Category images — find image URLs that were removed or replaced
        if (updates.categoryImages !== undefined) {
            try {
                const parseImgs = (val) => {
                    if (!val) return {};
                    return typeof val === 'string' ? JSON.parse(val) : val;
                };
                const oldCatImgs = parseImgs(store.categoryImages);
                const newCatImgs = parseImgs(updates.categoryImages);
                const newUrlSet = new Set(Object.values(newCatImgs).filter(Boolean));
                Object.values(oldCatImgs).forEach(url => {
                    if (url && !newUrlSet.has(url)) {
                        deleteStorageFile(url).catch(() => {});
                    }
                });
            } catch (e) {}
        }

        await store.update(updates);
        res.json(store);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update store' });
    }
});

// Delete store
router.delete('/:id', async (req, res) => {
    try {
        const store = await WaStore.findOne({
            where: { id: req.params.id, userId: req.user.id }
        });
        if (!store) return res.status(404).json({ error: 'Store not found' });

        // ── Collect all product images and delete from storage (fire-and-forget) ──
        const allProducts = await WaProduct.findAll({ where: { storeId: store.id } });
        allProducts.forEach(product => {
            const imageUrls = Array.isArray(product.imageUrls) ? product.imageUrls : [];
            imageUrls.forEach(url => deleteStorageFile(url).catch(() => {}));
        });

        // ── Delete store-level images from storage (fire-and-forget) ──
        if (store.logo)       deleteStorageFile(store.logo).catch(() => {});
        if (store.coverImage) deleteStorageFile(store.coverImage).catch(() => {});

        // Hero slide images
        const heroSlides = Array.isArray(store.heroSlides) ? store.heroSlides : [];
        heroSlides.forEach(slide => { if (slide?.imageUrl) deleteStorageFile(slide.imageUrl).catch(() => {}); });

        // Category images (stored as object { categoryName: url })
        try {
            const catImgs = typeof store.categoryImages === 'string'
                ? JSON.parse(store.categoryImages)
                : (store.categoryImages || {});
            Object.values(catImgs).forEach(url => { if (url) deleteStorageFile(url).catch(() => {}); });
        } catch (e) {}

        // Delete all products first
        await WaProduct.destroy({ where: { storeId: store.id } });

        await store.destroy();
        res.json({ success: true, message: 'Store deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete store' });
    }
});

// ==========================================
// PRODUCTS MANAGEMENT
// ==========================================

// Get all products for a store
router.get('/:storeId/products', async (req, res) => {
    try {
        // verify owner
        const store = await WaStore.findOne({ where: { id: req.params.storeId, userId: req.user.id }});
        if (!store) return res.status(404).json({ error: 'Store not found' });

        const products = await WaProduct.findAll({
            where: { storeId: req.params.storeId },
            order: [['createdAt', 'DESC']]
        });
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch products' });
    }
});

// Create product
router.post('/:storeId/products', async (req, res) => {
    try {
        const store = await WaStore.findOne({ where: { id: req.params.storeId, userId: req.user.id }});
        if (!store) return res.status(404).json({ error: 'Store not found' });

        const payload = { ...req.body, storeId: req.params.storeId };
        if (payload.compareAtPrice === '') payload.compareAtPrice = null;
        if (payload.wholesalePrice === '') payload.wholesalePrice = null;
        if (payload.minWholesaleQty === '') payload.minWholesaleQty = null;

        if (!payload.slug) {
            payload.slug = payload.name.toLowerCase().replace(/[^a-z0-9-]/g, '-');
        }
        
        let baseSlug = payload.slug || 'product';
        let slugExists = await WaProduct.findOne({ where: { storeId: req.params.storeId, slug: baseSlug } });
        let counter = 1;
        while (slugExists) {
            payload.slug = `${baseSlug}-${counter}`;
            slugExists = await WaProduct.findOne({ where: { storeId: req.params.storeId, slug: payload.slug } });
            counter++;
        }

        const product = await WaProduct.create(payload);
        res.status(201).json(product);
    } catch (error) {
        console.error('Create product error:', error);
        res.status(500).json({ error: 'Failed to create product' });
    }
});

// Update product
router.put('/products/:productId', async (req, res) => {
    try {
        const product = await WaProduct.findByPk(req.params.productId);
        if (!product) return res.status(404).json({ error: 'Product not found' });

        const store = await WaStore.findOne({ where: { id: product.storeId, userId: req.user.id } });
        if (!store) return res.status(403).json({ error: 'Unauthorized' });

        const payload = { ...req.body };
        if (payload.compareAtPrice === '') payload.compareAtPrice = null;
        if (payload.wholesalePrice === '') payload.wholesalePrice = null;
        if (payload.minWholesaleQty === '') payload.minWholesaleQty = null;

        if (!payload.slug && payload.name) {
            payload.slug = payload.name.toLowerCase().replace(/[^a-z0-9-]/g, '-');
        }
        if (payload.slug) {
            let baseSlug = payload.slug;
            let slugExists = await WaProduct.findOne({ where: { storeId: product.storeId, slug: baseSlug, id: { [Op.ne]: product.id } } });
            let counter = 1;
            while (slugExists) {
                payload.slug = `${baseSlug}-${counter}`;
                slugExists = await WaProduct.findOne({ where: { storeId: product.storeId, slug: payload.slug, id: { [Op.ne]: product.id } } });
                counter++;
            }
        }

        // ── Delete images that were removed or replaced (fire-and-forget) ──
        if (Array.isArray(payload.imageUrls)) {
            const oldUrls = Array.isArray(product.imageUrls) ? product.imageUrls : [];
            const newUrlSet = new Set(payload.imageUrls);
            const removedUrls = oldUrls.filter(url => !newUrlSet.has(url));
            removedUrls.forEach(url => deleteStorageFile(url).catch(() => {}));
        }

        await product.update(payload);
        res.json(product);
    } catch (error) {
        console.error('Update product error:', error);
        res.status(500).json({ error: 'Failed to update product' });
    }
});

// Delete product
router.delete('/products/:productId', async (req, res) => {
    try {
        const product = await WaProduct.findByPk(req.params.productId);
        if (!product) return res.status(404).json({ error: 'Product not found' });

        const store = await WaStore.findOne({ where: { id: product.storeId, userId: req.user.id } });
        if (!store) return res.status(403).json({ error: 'Unauthorized' });

        // ── Delete all product images from storage (fire-and-forget) ──
        const imageUrls = Array.isArray(product.imageUrls) ? product.imageUrls : [];
        imageUrls.forEach(url => deleteStorageFile(url).catch(() => {}));

        await product.destroy();
        res.json({ success: true, message: 'Product deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete product' });
    }
});


// ==========================================
// AI PRODUCT DESCRIPTION GENERATOR
// ==========================================
router.post('/ai-description', async (req, res) => {
    const { productName, keywords } = req.body;
    try {
        if (!productName) return res.status(400).json({ error: 'Product name is required' });

        const user = await User.findByPk(req.user.id);
        const sysConfig = await SystemConfig.getConfig();
        const multiplier = sysConfig?.settings?.aiTokenMultipliers?.ai_wastore ?? 3;
        const BASE_COST = 5; 
        const finalCost = Math.ceil(BASE_COST * multiplier);

        if (user.aiTokenBalance < finalCost) {
            return res.status(402).json({ error: `Insufficient AI tokens. Required: ${finalCost}` });
        }

        const { runAi } = require('../utils/aiRunner');

        const systemInstruction1 = `You are an expert e-commerce copywriter. 
The user is providing a product name and some optional keywords.
Your job is to generate a highly converting, SEO-optimized, and persuasive product description.
Do not use markdown formatting like ** or #. Just return pure text formatted nicely with line breaks if needed.
Be concise but extremely compelling. Max 2 short paragraphs.`;

        const prompt1 = `Product Name: ${productName}\nKeywords: ${keywords || 'None'}`;
        const { text: replyText1, modelUsed: model1 } = await runAi(sysConfig, systemInstruction1, prompt1, { temperature: 0.7, maxOutputTokens: 300 });
        console.log(`[WaStore AI] ai-description2 used model: ${model1}`);
        const replyText = replyText1;
        
        await user.decrement('aiTokenBalance', { by: finalCost });
        const newBal = (user.aiTokenBalance - finalCost);

        try {
            await AiTokenLog.create({
                userId: req.user.id,
                feature: 'ai_wastore_product_desc',
                tokensUsed: finalCost,
                balanceAfter: Math.max(0, newBal)
            });
        } catch (e) { console.warn(e); }

        res.json({
            description: replyText.trim(),
            tokensDeducted: finalCost,
            newBalance: newBal
        });
    } catch (err) {
        console.error('Error generating AI description:', err);
        res.status(500).json({ error: 'Failed to communicate with AI.' });
    }
});

router.post('/ai-seo', async (req, res) => {
    const { productName, description, category, price } = req.body;
    try {
        if (!productName) return res.status(400).json({ error: 'Product name is required' });

        const user = await User.findByPk(req.user.id);
        const sysConfig = await SystemConfig.getConfig();
        const multiplier = sysConfig?.settings?.aiTokenMultipliers?.ai_wastore ?? 3;
        const BASE_COST = 5; 
        const finalCost = Math.ceil(BASE_COST * multiplier);

        if (user.aiTokenBalance < finalCost) {
            return res.status(402).json({ error: `Insufficient AI tokens. Required: ${finalCost}` });
        }

        const { runAi } = require('../utils/aiRunner');

        const systemInstructionSeo = `You are an expert e-commerce SEO specialist. 
The user provides product details (name, description, category, price).
Your job is to generate a JSON object with:
1. "metaTitle": A catchy, SEO-friendly meta title (50-60 characters).
2. "metaDescription": A compelling, keyword-rich meta description (150-160 characters).
3. "slug": An SEO-friendly URL slug (lowercase, hyphen-separated, no special characters).

Return ONLY valid JSON. No markdown wrappers. Example:
{
  "metaTitle": "Premium Blue Cotton T-Shirt | BrandName",
  "metaDescription": "Upgrade your wardrobe with our Premium Blue Cotton T-Shirt. Breathable, stylish, and perfect for everyday wear. Shop now for the best deals!",
  "slug": "premium-blue-cotton-tshirt"
}`;

        const promptSeo = `Product Name: ${productName}\nDescription: ${description || 'None'}\nCategory: ${category || 'None'}\nPrice: ${price || 'None'}`;
        const { text: seoRaw, modelUsed: seoModel } = await runAi(sysConfig, systemInstructionSeo, promptSeo, { temperature: 0.7, maxOutputTokens: 300 });
        console.log(`[WaStore AI] SEO used model: ${seoModel}`);
        let replyText = seoRaw.replace(/```json/g, '').replace(/```/g, '').trim();
        
        const seoData = JSON.parse(replyText);

        await user.decrement('aiTokenBalance', { by: finalCost });
        const newBal = (user.aiTokenBalance - finalCost);

        try {
            await AiTokenLog.create({
                userId: req.user.id,
                feature: 'ai_wastore_seo',
                tokensUsed: finalCost,
                balanceAfter: Math.max(0, newBal)
            });
        } catch (e) { console.warn(e); }

        res.json({
            seo: seoData,
            tokensDeducted: finalCost,
            newBalance: newBal
        });
    } catch (err) {
        console.error('Error generating AI SEO:', err);
        res.status(500).json({ error: 'Failed to communicate with AI or parse response.' });
    }
});


// ==========================================
// ORDER MANAGEMENT (PROTECTED)
// ==========================================

// GET /api/wastore/:storeId/orders  — list all orders for a store
router.get('/:storeId/orders', async (req, res) => {
    try {
        const store = await WaStore.findOne({ where: { id: req.params.storeId, userId: req.user.id } });
        if (!store) return res.status(404).json({ error: 'Store not found' });

        const orders = await WaOrder.findAll({
            where: { storeId: req.params.storeId },
            order: [['createdAt', 'DESC']]
        });
        res.json(orders);
    } catch (error) {
        console.error('Fetch orders error:', error);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

// GET /api/wastore/:storeId/orders/:orderId  — single order detail
router.get('/:storeId/orders/:orderId', async (req, res) => {
    try {
        const store = await WaStore.findOne({ where: { id: req.params.storeId, userId: req.user.id } });
        if (!store) return res.status(404).json({ error: 'Store not found' });

        const order = await WaOrder.findOne({ where: { id: req.params.orderId, storeId: req.params.storeId } });
        if (!order) return res.status(404).json({ error: 'Order not found' });

        res.json(order);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch order' });
    }
});

// PATCH /api/wastore/:storeId/orders/:orderId  — update order status / notes
router.patch('/:storeId/orders/:orderId', async (req, res) => {
    try {
        const store = await WaStore.findOne({ where: { id: req.params.storeId, userId: req.user.id } });
        if (!store) return res.status(404).json({ error: 'Store not found' });

        const order = await WaOrder.findOne({ where: { id: req.params.orderId, storeId: req.params.storeId } });
        if (!order) return res.status(404).json({ error: 'Order not found' });

        const { status, notes } = req.body;
        const prevStatus = order.status;
        if (status) order.status = status;
        if (notes !== undefined) order.notes = notes;
        await order.save();

        // Fire notification for status change
        if (status && status !== prevStatus) {
            const triggerMap = {
                confirmed: 'order_confirmed',
                processing: 'order_processing',
                shipped: 'order_shipped',
                delivered: 'order_delivered',
                cancelled: 'order_cancelled',
            };
            const triggerKey = triggerMap[status];
            if (triggerKey) {
                const user = await User.findByPk(req.user.id);
                if (user) await sendOrderNotification(triggerKey, store, user, order);
            }

            // ── Fire CAPI Purchase when owner confirms an order ───────────────
            if (status === 'confirmed' && prevStatus !== 'confirmed') {
                fireCAPIPurchase(store, order).catch(() => {});
            }
        }

        res.json(order);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update order' });
    }
});

// POST /api/wastore/:storeId/orders/:orderId/fulfill — Fulfill order and send tracking WhatsApp
router.post('/:storeId/orders/:orderId/fulfill', async (req, res) => {
    try {
        const store = await WaStore.findOne({ where: { id: req.params.storeId, userId: req.user.id } });
        if (!store) return res.status(404).json({ error: 'Store not found' });

        const order = await WaOrder.findOne({ where: { id: req.params.orderId, storeId: req.params.storeId } });
        if (!order) return res.status(404).json({ error: 'Order not found' });

        const { trackingProvider, trackingUrl } = req.body;
        order.trackingProvider = trackingProvider;
        order.trackingUrl = trackingUrl;
        order.status = 'shipped';
        await order.save();

        const user = await User.findByPk(req.user.id);
        if (user && user.fbAccessToken && user.metaPhoneNumberId && order.customerPhone) {
            const axios = require('axios');
            let phone = order.customerPhone.replace(/\D/g, '');
            const messageText = `Hi ${order.customerName},\n\nGreat news! Your order *${order.orderNumber}* from ${store.name} has been shipped.\n\n`
                + `*Carrier:* ${trackingProvider || 'Our Delivery Partner'}\n`
                + (trackingUrl ? `*Track your order here:* ${trackingUrl}\n\n` : '\n')
                + `Thank you for shopping with us!`;

            try {
                await axios.post(`https://graph.facebook.com/v21.0/${user.metaPhoneNumberId}/messages`, {
                    messaging_product: 'whatsapp',
                    recipient_type: 'individual',
                    to: phone,
                    type: 'text',
                    text: { preview_url: true, body: messageText }
                }, {
                    headers: { 'Authorization': `Bearer ${user.fbAccessToken}`, 'Content-Type': 'application/json' }
                });
            } catch (err) {
                console.error("Failed to send tracking whatsapp:", err.response?.data || err.message);
            }
        }
        
        if (user) await sendOrderNotification('order_shipped', store, user, order);

        res.json(order);
    } catch (error) {
        console.error('Fulfill order error:', error);
        res.status(500).json({ error: 'Failed to fulfill order' });
    }
});

// ==========================================
// COUPON MANAGEMENT
// ==========================================

// Get coupons for a store
router.get('/:storeId/coupons', async (req, res) => {
    try {
        const store = await WaStore.findOne({ where: { id: req.params.storeId, userId: req.user.id } });
        if (!store) return res.status(404).json({ error: 'Store not found' });
        
        const coupons = await require('../models/WaStoreCoupon').findAll({ where: { storeId: req.params.storeId } });
        res.json(coupons);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch coupons' });
    }
});

// Create a coupon
router.post('/:storeId/coupons', async (req, res) => {
    try {
        const store = await WaStore.findOne({ where: { id: req.params.storeId, userId: req.user.id } });
        if (!store) return res.status(404).json({ error: 'Store not found' });

        // Sanitize numeric fields — empty strings from form inputs must become numbers/null
        const body = req.body;
        const coupon = await require('../models/WaStoreCoupon').create({
            storeId: store.id,
            code: (body.code || '').toUpperCase().trim(),
            discountType: body.discountType || 'percentage',
            discountValue: parseFloat(body.discountValue) || 0,
            minOrderValue: body.minOrderValue !== '' && body.minOrderValue != null ? parseFloat(body.minOrderValue) : 0,
            isActive: body.isActive !== undefined ? body.isActive : true,
            expiresAt: body.expiresAt || null
        });
        res.status(201).json(coupon);
    } catch (error) {
        console.error('Create coupon error:', error);
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ error: 'A coupon with this code already exists in your store.' });
        }
        if (error.name === 'SequelizeValidationError') {
            return res.status(400).json({ error: error.errors.map(e => e.message).join(', ') });
        }
        res.status(500).json({ error: error.message || 'Failed to create coupon' });
    }
});

// Update a coupon
router.put('/:storeId/coupons/:couponId', async (req, res) => {
    try {
        const store = await WaStore.findOne({ where: { id: req.params.storeId, userId: req.user.id } });
        if (!store) return res.status(404).json({ error: 'Store not found' });
        
        const coupon = await require('../models/WaStoreCoupon').findOne({ where: { id: req.params.couponId, storeId: store.id } });
        if (!coupon) return res.status(404).json({ error: 'Coupon not found' });

        const body = req.body;
        await coupon.update({
            ...(body.code !== undefined && { code: body.code.toUpperCase().trim() }),
            ...(body.discountType !== undefined && { discountType: body.discountType }),
            ...(body.discountValue !== undefined && { discountValue: parseFloat(body.discountValue) || 0 }),
            ...(body.minOrderValue !== undefined && { minOrderValue: body.minOrderValue !== '' ? parseFloat(body.minOrderValue) : 0 }),
            ...(body.isActive !== undefined && { isActive: body.isActive }),
            ...(body.expiresAt !== undefined && { expiresAt: body.expiresAt || null })
        });
        res.json(coupon);
    } catch (error) {
        console.error('Update coupon error:', error);
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ error: 'A coupon with this code already exists in your store.' });
        }
        res.status(500).json({ error: error.message || 'Failed to update coupon' });
    }
});

// Delete a coupon
router.delete('/:storeId/coupons/:couponId', async (req, res) => {
    try {
        const store = await WaStore.findOne({ where: { id: req.params.storeId, userId: req.user.id } });
        if (!store) return res.status(404).json({ error: 'Store not found' });
        
        const coupon = await require('../models/WaStoreCoupon').findOne({ where: { id: req.params.couponId, storeId: store.id } });
        if (!coupon) return res.status(404).json({ error: 'Coupon not found' });
        
        await coupon.destroy();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete coupon' });
    }
});

// Public Endpoint: Validate Coupon
router.post('/public/:slug/validate-coupon', async (req, res) => {
    try {
        const { code, cartTotal } = req.body;
        const store = await WaStore.findOne({ where: { slug: req.params.slug.toLowerCase(), isActive: true } });
        if (!store) return res.status(404).json({ error: 'Store not found' });

        const WaStoreCoupon = require('../models/WaStoreCoupon');

        // First check if coupon exists at all (ignoring isActive)
        const couponAny = await WaStoreCoupon.findOne({
            where: { storeId: store.id, code: code.toUpperCase().trim() }
        });

        if (!couponAny) {
            return res.status(400).json({ error: 'Invalid coupon code. Please check and try again.' });
        }
        if (!couponAny.isActive) {
            return res.status(400).json({ error: 'This coupon is currently inactive.' });
        }

        // Expiry check
        if (couponAny.expiresAt && new Date() > new Date(couponAny.expiresAt)) {
            return res.status(400).json({ error: 'This coupon has expired.' });
        }

        // Minimum order value check — fix: use cartTotal != null (not truthy check, so 0 is handled)
        const minOrder = parseFloat(couponAny.minOrderValue) || 0;
        if (minOrder > 0 && cartTotal != null && parseFloat(cartTotal) < minOrder) {
            const currSymbols = { USD: '$', EUR: '€', GBP: '£', INR: '₹', AED: 'د.إ', SGD: 'S$', AUD: 'A$', CAD: 'C$' };
            const sym = currSymbols[store.currency] || store.currency || '';
            return res.status(400).json({
                error: `Minimum order value of ${sym}${minOrder.toFixed(2)} required for this coupon.`
            });
        }

        res.json(couponAny);
    } catch (error) {
        console.error('Validate coupon error:', error);
        res.status(500).json({ error: 'Failed to validate coupon' });
    }

});

// ==========================================
// STORE ANALYTICS
// ==========================================

// GET /api/wastore/:storeId/analytics?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/:storeId/analytics', async (req, res) => {
    try {
        const store = await WaStore.findOne({ where: { id: req.params.storeId, userId: req.user.id } });
        if (!store) return res.status(404).json({ error: 'Store not found' });

        // Default range: last 30 days
        const to = req.query.to ? new Date(req.query.to) : new Date();
        const from = req.query.from ? new Date(req.query.from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        to.setHours(23, 59, 59, 999);
        from.setHours(0, 0, 0, 0);

        const whereClause = {
            storeId: store.id,
            createdAt: { [Op.between]: [from, to] }
        };

        // --- KPI Summary ---
        const allOrders = await WaOrder.findAll({ where: whereClause });
        const totalOrders = allOrders.length;
        const totalRevenue = allOrders.reduce((sum, o) => sum + parseFloat(o.subtotal || 0), 0);
        const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

        // Status counts
        const statusCounts = { pending: 0, confirmed: 0, processing: 0, shipped: 0, delivered: 0, cancelled: 0 };
        allOrders.forEach(o => { if (statusCounts[o.status] !== undefined) statusCounts[o.status]++; });

        // --- Daily Trend (orders count + revenue per day) ---
        const dailyMap = {};
        allOrders.forEach(order => {
            const day = new Date(order.createdAt).toISOString().slice(0, 10);
            if (!dailyMap[day]) dailyMap[day] = { date: day, orders: 0, revenue: 0 };
            dailyMap[day].orders++;
            dailyMap[day].revenue = parseFloat((dailyMap[day].revenue + parseFloat(order.subtotal || 0)).toFixed(2));
        });

        // Fill in missing dates in range
        const dailyTrend = [];
        const cursor = new Date(from);
        while (cursor <= to) {
            const key = cursor.toISOString().slice(0, 10);
            dailyTrend.push(dailyMap[key] || { date: key, orders: 0, revenue: 0 });
            cursor.setDate(cursor.getDate() + 1);
        }

        // --- Top Products (aggregate items JSON) ---
        const productCounts = {};
        allOrders.forEach(order => {
            const items = Array.isArray(order.items) ? order.items : [];
            items.forEach(item => {
                const name = item.name || 'Unknown';
                if (!productCounts[name]) productCounts[name] = { name, orders: 0, revenue: 0 };
                productCounts[name].orders += (item.qty || 1);
                productCounts[name].revenue = parseFloat((productCounts[name].revenue + (parseFloat(item.price || 0) * (item.qty || 1))).toFixed(2));
            });
        });
        const topProducts = Object.values(productCounts)
            .sort((a, b) => b.orders - a.orders)
            .slice(0, 5);

        // --- Total products & coupons count ---
        const totalProducts = await WaProduct.count({ where: { storeId: store.id } });

        res.json({
            storeViews: store.views || 0,
            totalOrders,
            totalRevenue: parseFloat(totalRevenue.toFixed(2)),
            avgOrderValue: parseFloat(avgOrderValue.toFixed(2)),
            totalProducts,
            statusCounts,
            dailyTrend,
            topProducts,
            currency: store.currency || 'USD',
            dateRange: { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) }
        });
    } catch (error) {
        console.error('Analytics error:', error);
        res.status(500).json({ error: 'Failed to fetch analytics' });
    }
});

module.exports = router;
