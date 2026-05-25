const express = require('express');
const router = express.Router();
const NfcCard = require('../models/NfcCard');
const NfcOrder = require('../models/NfcOrder');
const User = require('../models/User');
const Vcard = require('../models/Vcard');
const crypto = require('crypto');
const { Op } = require('sequelize');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const SystemConfig = require('../models/SystemConfig');
const path = require('path');
const fs = require('fs');
const logActivity = require('../utils/logger');
const storageProvider = require('../utils/storageProvider');

// All routes require authentication and admin privileges
router.use(auth);
router.use(admin);

// Generate a single short code using cryptographically secure randomness
// Charset deliberately excludes visually ambiguous chars: 0, O, I, 1
const SHORTCODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const SHORTCODE_LEN = 8;

const generateShortCode = () => {
    const bytes = crypto.randomBytes(SHORTCODE_LEN);
    let result = '';
    for (let i = 0; i < SHORTCODE_LEN; i++) {
        result += SHORTCODE_CHARS[bytes[i] % SHORTCODE_CHARS.length];
    }
    return result;
};

// @route   POST /api/admin/nfc/generate
// @desc    Generate a batch of NFC cards with guaranteed unique shortcodes
router.post('/generate', async (req, res) => {
    try {
        const { count, type, batchId } = req.body;

        if (!count || !type || !batchId) {
            return res.status(400).json({ error: 'Please provide count, type, and batchId' });
        }

        const MAX_ATTEMPTS = count * 10; // safety ceiling to avoid infinite loops
        let attempts = 0;

        // Step 1: Generate a deduplicated Set of codes (no within-batch duplicates)
        const codeSet = new Set();
        while (codeSet.size < count) {
            if (++attempts > MAX_ATTEMPTS) {
                return res.status(500).json({ error: 'Failed to generate enough unique codes. Try a smaller batch.' });
            }
            codeSet.add(generateShortCode());
        }

        let candidates = Array.from(codeSet);

        // Step 2: Check against ALL existing codes in the database (cross-batch safety)
        const existing = await NfcCard.findAll({
            where: { shortCode: { [Op.in]: candidates } },
            attributes: ['shortCode']
        });
        const existingSet = new Set(existing.map(c => c.shortCode));

        // Step 3: Replace any conflicts with fresh unique codes
        for (let i = 0; i < candidates.length; i++) {
            while (existingSet.has(candidates[i]) || candidates.indexOf(candidates[i]) !== i) {
                if (++attempts > MAX_ATTEMPTS) {
                    return res.status(500).json({ error: 'Too many collisions encountered. Please retry.' });
                }
                const replacement = generateShortCode();
                // Only accept if not in DB and not a duplicate within our own candidate list
                if (!existingSet.has(replacement) && !candidates.slice(0, i).includes(replacement) && !candidates.slice(i + 1).includes(replacement)) {
                    candidates[i] = replacement;
                }
            }
        }

        // Step 4: Build the final records and bulk insert
        const cards = candidates.map(shortCode => ({
            shortCode,
            type,
            batchId,
            status: 'unassigned'
        }));

        await NfcCard.bulkCreate(cards, { returning: true });

        await logActivity(req, 'NFC Batch Generated', `Admin generated ${count} NFC cards for batch: ${batchId}`);
        res.json({ message: `${count} NFC cards generated successfully for batch ${batchId}.` });
    } catch (err) {
        console.error('[NFC GENERATE ERROR]', err);
        res.status(500).json({ error: 'Server error generating NFC cards.' });
    }
});

// @route   GET /api/admin/nfc/cards
// @desc    Get all NFC cards
router.get('/cards', async (req, res) => {
    try {
        const cards = await NfcCard.findAll({
            include: [
                { model: User, as: 'owner', attributes: ['id', 'name', 'email'] },
                { model: Vcard, as: 'vcard', attributes: ['id', 'name', 'slug'] }
            ],
            order: [['createdAt', 'DESC']]
        });
        res.json(cards);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error fetching NFC cards.' });
    }
});

// @route   DELETE /api/admin/nfc/cards/:id
// @desc    Delete a specific NFC card (only unassigned or admin override)
router.delete('/cards/:id', async (req, res) => {
    try {
        const card = await NfcCard.findByPk(req.params.id);
        if (!card) return res.status(404).json({ error: 'Card not found' });
        
        await card.destroy();
        res.json({ message: 'Card deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error deleting card' });
    }
});

// @route   GET /api/admin/nfc/orders
// @desc    Get all NFC orders
router.get('/orders', async (req, res) => {
    try {
        const orders = await NfcOrder.findAll({
            include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email', 'phoneNumber'] }],
            order: [['createdAt', 'DESC']]
        });
        res.json(orders);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error fetching orders.' });
    }
});

// @route   PUT /api/admin/nfc/orders/:id
// @desc    Update order status
router.put('/orders/:id', async (req, res) => {
    try {
        const { status, paymentStatus } = req.body;
        const order = await NfcOrder.findByPk(req.params.id);
        
        if (!order) return res.status(404).json({ error: 'Order not found' });

        if (status) order.status = status;
        if (paymentStatus) order.paymentStatus = paymentStatus;

        await order.save();
        res.json(order);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error updating order' });
    }
});

// @route   POST /api/admin/nfc/catalog/image
// @desc    Upload an image for an NFC product
router.post('/catalog/image',
    storageProvider('nfc', {
        limits: { fileSize: 10 * 1024 * 1024 },
        fileFilter: (req, file, cb) => {
            if (file.mimetype.startsWith('image/')) return cb(null, true);
            cb(new Error('Only image files are allowed.'));
        }
    }).single('file'),
    async (req, res) => {
        try {
            if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
            res.status(201).json({ url: req.file.publicUrl, filename: req.file.filename || req.file.key });
        } catch (err) {
            console.error('[NFC PRODUCT IMAGE UPLOAD ERROR]', err);
            res.status(500).json({ error: err.message });
        }
    }
);

// @route   POST /api/admin/nfc/catalog
// @desc    Add or Update a product in the NFC Catalog
router.post('/catalog', async (req, res) => {
    try {
        const { id, name, desc, price, imageUrl, type } = req.body;
        
        if (!name || !price || !type) {
            return res.status(400).json({ error: 'Name, price, and type are required.' });
        }

        const config = await SystemConfig.getConfig();
        const settings = config.settings || {};
        if (!settings.nfcCatalog) settings.nfcCatalog = [];
        
        let catalog = settings.nfcCatalog;
        let isUpdate = false;
        
        if (id) {
            // Update existing
            const idx = catalog.findIndex(p => p.id === id);
            if (idx !== -1) {
                catalog[idx] = { ...catalog[idx], name, desc, price: parseFloat(price), imageUrl, type };
                isUpdate = true;
            } else {
                // If ID provided but not found, act as new
                catalog.push({ id: crypto.randomUUID(), name, desc, price: parseFloat(price), imageUrl, type });
            }
        } else {
            // New product
            catalog.push({ id: crypto.randomUUID(), name, desc, price: parseFloat(price), imageUrl, type });
        }
        
        config.changed('settings', true);
        await config.save();
        
        await logActivity(req, 'NFC Catalog Updated', `Admin ${isUpdate ? 'updated' : 'added'} NFC product: ${name}`);
        res.json({ success: true, catalog });
    } catch (err) {
        console.error('[NFC CATALOG ADD ERROR]', err);
        res.status(500).json({ error: err.message });
    }
});

// @route   DELETE /api/admin/nfc/catalog/:id
// @desc    Delete a product from the NFC Catalog
router.delete('/catalog/:id', async (req, res) => {
    try {
        const config = await SystemConfig.getConfig();
        const settings = config.settings || {};
        if (!settings.nfcCatalog) return res.status(404).json({ error: 'Catalog is empty' });
        
        const catalog = settings.nfcCatalog;
        const idx = catalog.findIndex(p => p.id === req.params.id);
        
        if (idx === -1) return res.status(404).json({ error: 'Product not found' });
        
        const deletedProduct = catalog[idx];
        
        // Remove product
        catalog.splice(idx, 1);
        config.changed('settings', true);
        await config.save();
        
        await logActivity(req, 'NFC Catalog Updated', `Admin deleted NFC product: ${deletedProduct.name}`);
        res.json({ success: true, catalog });
    } catch (err) {
        console.error('[NFC CATALOG DELETE ERROR]', err);
        res.status(500).json({ error: err.message });
    }
});

// @route   GET /api/admin/nfc/banner-settings
// @desc    Get the NFC banner visibility setting
router.get('/banner-settings', async (req, res) => {
    try {
        const config = await SystemConfig.getConfig();
        const settings = config.settings || {};
        res.json({ 
            showNfcBanner: settings.showNfcBanner !== false, // default true
            nfcBannerImage: settings.nfcBannerImage || null
        });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   PUT /api/admin/nfc/banner-settings
// @desc    Toggle NFC banner visibility for vCard sidebar
router.put('/banner-settings', async (req, res) => {
    try {
        const { showNfcBanner, nfcBannerImage } = req.body;
        const config = await SystemConfig.getConfig();
        const settings = config.settings || {};
        
        if (typeof showNfcBanner !== 'undefined') settings.showNfcBanner = !!showNfcBanner;
        if (typeof nfcBannerImage !== 'undefined') settings.nfcBannerImage = nfcBannerImage;
        
        config.settings = settings;
        config.changed('settings', true);
        await config.save();
        res.json({ 
            showNfcBanner: settings.showNfcBanner,
            nfcBannerImage: settings.nfcBannerImage
        });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
