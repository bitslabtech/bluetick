const express = require('express');
const router = express.Router();
const NfcCard = require('../models/NfcCard');
const NfcOrder = require('../models/NfcOrder');
const Vcard = require('../models/Vcard');
const SystemConfig = require('../models/SystemConfig');
const auth = require('../middleware/auth');

// All routes require user authentication
router.use(auth);

// @route   POST /api/nfc/order
// @desc    Submit a purchase order for NFC products
router.post('/order', async (req, res) => {
    try {
        const { productType, quantity, shippingAddress, contactNumber, amount } = req.body;
        
        const order = await NfcOrder.create({
            userId: req.user.id,
            productType,
            quantity: quantity || 1,
            shippingAddress,
            contactNumber,
            amount: amount || 0,
            status: 'pending',
            paymentStatus: 'pending' // Usually payment integration updates this
        });

        res.json({ message: 'Order placed successfully', order });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create order.' });
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
