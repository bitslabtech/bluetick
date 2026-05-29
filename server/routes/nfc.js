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

// @route   POST /api/nfc/order
// @desc    Submit a purchase order for NFC products and initialize checkout
router.post('/order', async (req, res) => {
    try {
        const { productType, quantity, shippingAddress, contactNumber, amount } = req.body;
        
        // Find user for email prefill
        const user = await User.findByPk(req.user.id);
        
        const order = await NfcOrder.create({
            userId: req.user.id,
            productType,
            quantity: quantity || 1,
            shippingAddress,
            contactNumber,
            amount: amount || 0,
            status: 'pending',
            paymentStatus: 'pending'
        });

        const { successUrl, cancelUrl } = req.body;
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        
        const paymentIntent = await PaymentService.createPaymentIntent({
            amount: amount || 0,
            currency: 'INR',
            description: `NFC Product - ${productType}`,
            orderNotes: { userId: req.user.id, orderId: order.id },
            userEmail: user.email,
            userName: user.name,
            successUrl: successUrl || `${frontendUrl}/dashboard?nfc_success=true&order_id=${order.id}`,
            cancelUrl: cancelUrl || `${frontendUrl}/dashboard?nfc_canceled=true`
        });

        order.paymentGateway = paymentIntent.gateway;
        order.paymentSessionId = paymentIntent.orderId || paymentIntent.sessionId || paymentIntent.transactionId;
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
        
        const order = await NfcOrder.findByPk(nfcOrderId);
        if (!order) return res.status(404).json({ error: 'Order not found' });
        if (order.paymentStatus === 'paid') return res.json({ success: true, message: 'Already paid' });

        try {
            await PaymentService.verifyPayment({ gateway, payload });
        } catch (e) {
            order.paymentStatus = 'failed';
            await order.save();
            return res.status(400).json({ error: e.message || 'Payment verification failed.' });
        }

        // Signature/Session is valid, mark order paid!
        let transactionReference = payload.razorpay_order_id || payload.session_id || payload.txn_id || payload.order_id || order.paymentSessionId || 'unknown';

        order.paymentStatus = 'paid';
        order.paymentId = transactionReference;
        await order.save();

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
