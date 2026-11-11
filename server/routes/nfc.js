const express = require('express');
const router = express.Router();
const NfcCard = require('../models/NfcCard');
const NfcOrder = require('../models/NfcOrder');
const Vcard = require('../models/Vcard');
const SystemConfig = require('../models/SystemConfig');
const auth = require('../middleware/auth');

// All routes require user authentication
router.use(auth);

const crypto = require('crypto');
const Settings = require('../models/Settings');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const SystemNotification = require('../models/SystemNotification');
const AdminNotification = require('../models/AdminNotification');
const PaymentService = require('../services/PaymentService');
const { sendAdminAlert } = require('../services/systemMessenger');

// @route   POST /api/nfc/order
// @desc    Submit a purchase order for NFC products and initialize checkout
router.post('/order', async (req, res) => {
    try {
        // NOTE: any `amount` in the body is ignored — the price comes from the admin catalog.
        const { productId, productType, quantity, shippingAddress, contactNumber } = req.body;

        // Resolve the product from the catalog (by id; by name for older clients)
        const config = await SystemConfig.getCachedConfig();
        const catalog = Array.isArray(config?.settings?.nfcCatalog) ? config.settings.nfcCatalog : [];
        const product = (productId && catalog.find(p => p.id === productId))
            || (!productId && productType && catalog.find(p => p.name === productType))
            || null;
        if (!product) return res.status(400).json({ error: 'Please select a valid product.' });

        const unitPrice = parseFloat(product.price);
        if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
            return res.status(400).json({ error: 'This product is not available for purchase right now.' });
        }
        const qty = parseInt(quantity, 10);
        if (!Number.isInteger(qty) || qty < 1 || qty > 100) {
            return res.status(400).json({ error: 'Quantity must be between 1 and 100.' });
        }
        const amount = Math.round(unitPrice * qty * 100) / 100;

        // Find user for email prefill
        const user = await User.findByPk(req.user.id);

        const order = await NfcOrder.create({
            userId: req.user.id,
            productType: product.name,
            quantity: qty,
            shippingAddress,
            contactNumber,
            amount,
            status: 'pending',
            paymentStatus: 'pending'
        });

        const { successUrl, cancelUrl } = req.body;
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

        const paymentIntent = await PaymentService.createPaymentIntent({
            amount,
            currency: 'INR',
            description: `NFC Product - ${product.name}`,
            orderNotes: { userId: req.user.id, orderId: order.id },
            userEmail: user.email,
            userName: user.name,
            userPhone: contactNumber || '',
            successUrl: successUrl || `${frontendUrl}/dashboard?nfc_success=true&order_id=${order.id}`,
            cancelUrl: cancelUrl || `${frontendUrl}/dashboard?nfc_canceled=true`
        });

        order.paymentGateway = paymentIntent.gateway;
        order.paymentSessionId = PaymentService.getIntentReference(paymentIntent);
        if (!order.paymentSessionId) {
            console.error('[NFC] order: gateway returned no order reference', paymentIntent?.gateway);
            return res.status(502).json({ error: 'Could not start the payment. Please try again.' });
        }
        await order.save();

        return res.json({
            ...paymentIntent,
            nfcOrderId: order.id,
            prefill: { name: user.name, email: user.email, contact: contactNumber }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create order.' });
    }
});

// @route   POST /api/nfc/verify-payment
// @desc    Verify payment signature / session and mark order paid
router.post('/verify-payment', async (req, res) => {
    try {
        const { gateway, payload, nfcOrderId } = req.body;

        // The payment must be the one created for this order, by this user.
        const transactionReference = PaymentService.getPayloadReference(gateway, payload);
        if (!transactionReference) return res.status(400).json({ error: 'Missing payment reference.' });

        // Redirect gateways don't carry nfcOrderId back, so fall back to the payment reference
        const order = nfcOrderId
            ? await NfcOrder.findOne({ where: { id: nfcOrderId, userId: req.user.id } })
            : await NfcOrder.findOne({ where: { paymentSessionId: transactionReference, userId: req.user.id } });
        if (!order) return res.status(404).json({ error: 'Order not found' });
        if (order.paymentGateway !== gateway || order.paymentSessionId !== transactionReference) {
            console.warn(`[SECURITY] NFC verify rejected — payment '${transactionReference}' (${gateway}) is not for order ${order.id}. User: ${req.user.id}`);
            return res.status(400).json({ error: 'This payment was not made for this order.' });
        }
        if (order.paymentStatus === 'paid') return res.json({ success: true, message: 'Already paid' });

        try {
            await PaymentService.verifyPayment({ gateway, payload });
        } catch (e) {
            order.paymentStatus = 'failed';
            await order.save();
            return res.status(400).json({ error: e.message || 'Payment verification failed.' });
        }

        // Atomic: only one request can mark this order paid (prevents duplicate records/alerts)
        const [updatedRows] = await NfcOrder.update(
            { paymentStatus: 'paid', paymentId: transactionReference },
            { where: { id: order.id, paymentStatus: ['pending', 'failed'] } }
        );
        if (updatedRows === 0) return res.json({ success: true, message: 'Already paid' });
        order.paymentStatus = 'paid';
        order.paymentId = transactionReference;

        // Log Transaction for global analytics
        await Transaction.create({
            userId: order.userId,
            amount: order.amount,
            currency: 'INR',
            planName: `Store: ${order.productType}`,
            status: 'COMPLETED',
            paymentGateway: gateway,
            transactionReference: transactionReference
        });
        
        await SystemNotification.create({
            userId: order.userId,
            title: 'NFC Order Confirmed',
            message: `Your payment for ${order.productType} was successful. We will process your order soon.`,
            type: 'info'
        });

        await AdminNotification.create({
            title: 'New NFC Product Order',
            message: `A new NFC order for ${order.productType} has been placed and paid successfully.`,
            type: 'info'
        });

        // 🚨 WA ADMIN NOTIFICATION - NFC ORDER
        try {
            const buyer = await User.findByPk(order.userId);
            await sendAdminAlert('nfc_order', `New NFC order placed by ${buyer?.name || 'a user'}`, {
                name: buyer?.name || 'Customer',
                orderId: order.id.split('-')[0].toUpperCase()
            });
        } catch (waErr) { console.error('[WA ALERT] nfc_order failed:', waErr.message); }
        
        return res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Payment verification failed' });
    }
});

// @route   GET /api/nfc/orders
// @desc    Get user's NFC orders
router.get('/orders', async (req, res) => {
    try {
        const orders = await NfcOrder.findAll({
            where: { userId: req.user.id },
            order: [['createdAt', 'DESC']]
        });
        res.json(orders);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch orders.' });
    }
});

// @route   GET /api/nfc/banner-settings
// @desc    Get the NFC banner visibility setting
router.get('/banner-settings', async (req, res) => {
    try {
        const config = await SystemConfig.getCachedConfig();
        const settings = config.settings || {};
        res.json({ 
            showNfcBanner: settings.showNfcBanner !== false, // default true
            nfcBannerImage: settings.nfcBannerImage || null
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error fetching banner settings' });
    }
});

// @route   GET /api/nfc/catalog
// @desc    Get the public NFC product catalog
router.get('/catalog', async (req, res) => {
    try {
        const config = await SystemConfig.getCachedConfig();
        const settings = config.settings || {};
        const catalog = settings.nfcCatalog || [];
        
        // If empty, we can provide some default placeholders or just return empty array
        // and let the frontend handle it. Let's return the catalog as is.
        res.json(catalog);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error fetching catalog' });
    }
});

// @route   GET /api/nfc/my-cards
// @desc    Get NFC cards linked to the user
router.get('/my-cards', async (req, res) => {
    try {
        const cards = await NfcCard.findAll({
            where: { userId: req.user.id },
            include: [{ model: Vcard, as: 'vcard', attributes: ['id', 'name', 'slug'] }]
        });
        res.json(cards);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch your linked cards.' });
    }
});

// @route   POST /api/nfc/link
// @desc    Link an NFC card to a specific vCard
router.post('/link', async (req, res) => {
    try {
        const { shortCode, vcardId } = req.body;

        // Verify vcard belongs to user
        const vcard = await Vcard.findOne({ where: { id: vcardId, userId: req.user.id } });
        if (!vcard) return res.status(403).json({ error: 'vCard not found or unauthorized.' });

        const card = await NfcCard.findOne({ where: { shortCode: shortCode.toUpperCase() } });
        
        if (!card) return res.status(404).json({ error: 'Invalid NFC code.' });
        if (card.status === 'assigned') return res.status(400).json({ error: 'This NFC card is already assigned to someone.' });

        card.status = 'assigned';
        card.userId = req.user.id;
        card.vcardId = vcard.id;
        await card.save();

        res.json({ message: 'NFC device successfully linked!', card });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error linking card.' });
    }
});

// @route   POST /api/nfc/unlink
// @desc    Unlink an NFC card
router.post('/unlink', async (req, res) => {
    try {
        const { id } = req.body;
        
        const card = await NfcCard.findOne({ where: { id, userId: req.user.id } });
        if (!card) return res.status(404).json({ error: 'Card not found or unauthorized.' });

        card.status = 'unassigned';
        card.userId = null;
        card.vcardId = null;
        await card.save();

        res.json({ message: 'NFC device unlinked.', card });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error unlinking card.' });
    }
});

module.exports = router;
