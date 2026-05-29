const express = require('express');
const router = express.Router();
const AddonModel = require('../models/Addon');
const UserAddonModel = require('../models/UserAddon');
const User = require('../models/User');
const Settings = require('../models/Settings');
const auth = require('../middleware/auth');
const logActivity = require('../utils/logger');
const crypto = require('crypto');

const PaymentService = require('../services/PaymentService');

// Protect all addon routes
router.use(auth);

// GET all active addons for the marketplace
router.get('/', async (req, res) => {
    try {
        const addons = await AddonModel.findAll({
            where: { isActive: true },
            order: [['createdAt', 'DESC']]
        });
        res.json(addons);
    } catch (err) {
        console.error("GET Active Addons Error:", err);
        res.status(500).json({ error: 'Server Error' });
    }
});

// GET user's purchased addons
router.get('/my', async (req, res) => {
    try {
        const userAddons = await UserAddonModel.findAll({
            where: { userId: req.user.id },
            include: [{ model: AddonModel }]
        });
        res.json(userAddons);
    } catch (err) {
        console.error("GET User Addons Error:", err);
        res.status(500).json({ error: 'Server Error' });
    }
});

// GET user's config for a specific addon
router.get('/my/:module_key/config', async (req, res) => {
    try {
        const addon = await AddonModel.findOne({ where: { module_key: req.params.module_key } });
        if (!addon) return res.status(404).json({ error: 'Add-on not found' });

        const userAddon = await UserAddonModel.findOne({ where: { userId: req.user.id, addonId: addon.id } });
        if (!userAddon || userAddon.status !== 'active') return res.status(403).json({ error: 'Not authorized' });

        // Mask any sensitive fields before returning to browser
        const safeConfig = { ...(userAddon.config || {}) };
        if (safeConfig.apiKey) {
            const val = safeConfig.apiKey;
            safeConfig.apiKey = val.length > 4 ? '••••••••' + val.slice(-4) : '••••••••';
        }

        res.json({ ...safeConfig, currentPeriodEnd: userAddon.currentPeriodEnd });
    } catch (err) {
        console.error("GET Addon Config Error:", err);
        res.status(500).json({ error: 'Server Error' });
    }
});

// PUT Save user's config for a specific addon
router.put('/my/:module_key/config', async (req, res) => {
    try {
        const { module_key } = req.params;
        const configData = { ...req.body };

        const addon = await AddonModel.findOne({ where: { module_key } });
        if (!addon) return res.status(404).json({ error: 'Add-on not found' });

        const userAddon = await UserAddonModel.findOne({
            where: { userId: req.user.id, addonId: addon.id }
        });

        if (!userAddon || userAddon.status !== 'active') {
            return res.status(403).json({ error: 'You do not own this add-on or it is not active.' });
        }

        // Preserve existing apiKey if client sent back a masked value
        if (configData.apiKey && typeof configData.apiKey === 'string' && configData.apiKey.startsWith('••••••••')) {
            configData.apiKey = userAddon.config?.apiKey || '';
        }

        userAddon.config = { ...(userAddon.config || {}), ...configData };
        await userAddon.save();

        // Mask sensitive fields before returning to browser
        const responseConfig = { ...(userAddon.config || {}) };
        if (responseConfig.apiKey) {
            const val = responseConfig.apiKey;
            responseConfig.apiKey = val.length > 4 ? '••••••••' + val.slice(-4) : '••••••••';
        }

        res.json({ message: 'Configuration saved successfully', config: responseConfig });
    } catch (err) {
        console.error("Save Addon Config Error:", err);
        res.status(500).json({ error: 'Server Error' });
    }
});

// POST Create Order for Addon
router.post('/:id/create-order', async (req, res) => {
    try {
        const addon = await AddonModel.findByPk(req.params.id);

        if (!addon || !addon.isActive) {
            return res.status(404).json({ error: 'Add-on not found or unavailable' });
        }

        // Check if already purchased
        const existing = await UserAddonModel.findOne({
            where: {
                userId: req.user.id,
                addonId: addon.id
            }
        });

        if (existing && existing.status === 'active') {
            return res.status(400).json({ error: 'You already own this add-on' });
        }

        const SystemConfig = require('../models/SystemConfig');
        const sysConfig = await SystemConfig.getConfig();
        const isGodMode = sysConfig?.settings?.linkedAdminUserId === req.user.id || req.user.plan === 'System CRM';

        // If it's a FREE add-on OR user is the System CRM account, activate instantly without Stripe/Razorpay
        if (!addon.price || parseFloat(addon.price) === 0 || isGodMode) {
            let nextEnd = null;
            if (addon.isRecurring && addon.recurringInterval) {
                const now = new Date();
                nextEnd = new Date(now);
                if (addon.recurringInterval === 'month') nextEnd.setMonth(nextEnd.getMonth() + 1);
                else if (addon.recurringInterval === 'year') nextEnd.setFullYear(nextEnd.getFullYear() + 1);
            }

            if (existing) {
                existing.status = 'active';
                if (nextEnd) {
                    existing.currentPeriodStart = new Date();
                    existing.currentPeriodEnd = nextEnd;
                }
                await existing.save();
            } else {
                await UserAddonModel.create({
                    userId: req.user.id,
                    addonId: addon.id,
                    status: 'active',
                    currentPeriodStart: nextEnd ? new Date() : null,
                    currentPeriodEnd: nextEnd
                });
            }
            await logActivity(req, 'Addon Activated', `User activated free add-on: ${addon.name}`);
            return res.json({ instant: true, message: 'Free add-on activated instantly.' });
        }

        // It is a PAID add-on -> Generate Order via PaymentService
        const finalPriceToCharge = parseFloat(addon.price);
        const { successUrl, cancelUrl } = req.body;
        
        const paymentIntent = await PaymentService.createPaymentIntent({
            amount: finalPriceToCharge,
            currency: addon.currency || 'USD',
            description: `Add-on: ${addon.name}`,
            orderNotes: { userId: req.user.id, addonId: addon.id },
            userEmail: req.user.email,
            userName: req.user.name,
            successUrl: successUrl || `${process.env.FRONTEND_URL || 'http://localhost:5173'}/app/marketplace/${addon.id}`,
            cancelUrl: cancelUrl || `${process.env.FRONTEND_URL || 'http://localhost:5173'}/app/marketplace/${addon.id}`
        });

        res.json({
            ...paymentIntent,
            addonName: addon.name,
            instant: false
        });

    } catch (err) {
        console.error("Create Addon Order Error:", err);
        res.status(500).json({ error: err.message || 'Server Error' });
    }
});

// POST Verify Payment and Activate Addon
router.post('/:id/verify-payment', async (req, res) => {
    try {
        const { gateway, payload } = req.body;

        if (!gateway || !payload) {
            return res.status(400).json({ error: 'Missing payment verification fields.' });
        }

        const addon = await AddonModel.findByPk(req.params.id);
        if (!addon) return res.status(404).json({ error: 'Addon not found' });

        try {
            await PaymentService.verifyPayment({ gateway, payload });
        } catch (e) {
            return res.status(400).json({ error: e.message || 'Payment verification failed.' });
        }

        // Signature is valid, activate the addon!
        const existing = await UserAddonModel.findOne({
            where: {
                userId: req.user.id,
                addonId: addon.id
            }
        });

        let nextEnd = null;
        if (addon.isRecurring && addon.recurringInterval) {
            const now = new Date();
            nextEnd = new Date(now);
            if (addon.recurringInterval === 'month') nextEnd.setMonth(nextEnd.getMonth() + 1);
            else if (addon.recurringInterval === 'year') nextEnd.setFullYear(nextEnd.getFullYear() + 1);
        }

        if (existing) {
            existing.status = 'active';
            if (nextEnd) {
                existing.currentPeriodStart = new Date();
                existing.currentPeriodEnd = nextEnd;
            }
            await existing.save();
        } else {
            await UserAddonModel.create({
                userId: req.user.id,
                addonId: addon.id,
                status: 'active',
                currentPeriodStart: nextEnd ? new Date() : null,
                currentPeriodEnd: nextEnd
            });
        }

        await logActivity(req, 'Addon Purchased', `User securely purchased add-on: ${addon.name} via Razorpay`);

        // Return success
        res.json({ success: true, message: 'Payment verified and add-on activated!' });

    } catch (err) {
        console.error('Verify Addon Payment Error:', err);
        res.status(500).json({ error: err.message || 'Payment verification failed' });
    }
});

// ── Knowledge Base File Upload: Parse text/PDF and return extracted text ──
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const kbUpload = multer({
    dest: 'uploads/kb_temp/',
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
    fileFilter: (req, file, cb) => {
        const allowed = ['text/plain', 'application/pdf', 'text/markdown', 'text/csv'];
        if (allowed.includes(file.mimetype) || file.originalname.endsWith('.txt') || file.originalname.endsWith('.pdf') || file.originalname.endsWith('.md') || file.originalname.endsWith('.csv')) {
            cb(null, true);
        } else {
            cb(new Error('Only .txt, .pdf, .md, and .csv files are supported.'));
        }
    }
});

router.post('/my/ai_bot/parse-knowledge-file', kbUpload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded.' });
        }

        const filePath = req.file.path;
        const originalName = req.file.originalname;
        let extractedText = '';

        if (req.file.mimetype === 'application/pdf' || originalName.endsWith('.pdf')) {
            // Parse PDF
            const pdfParse = require('pdf-parse');
            const dataBuffer = fs.readFileSync(filePath);
            const pdfData = await pdfParse(dataBuffer);
            extractedText = pdfData.text || '';
        } else {
            // Plain text / markdown / csv
            extractedText = fs.readFileSync(filePath, 'utf-8');
        }

        // Cleanup temp file
        try { fs.unlinkSync(filePath); } catch (e) { /* ignore */ }

        if (!extractedText.trim()) {
            return res.status(400).json({ error: 'No text could be extracted from the file.' });
        }

        // Truncate if excessively long (keep under ~50k chars to avoid huge prompts)
        const maxLength = 50000;
        if (extractedText.length > maxLength) {
            extractedText = extractedText.substring(0, maxLength) + '\n\n... (content truncated — file exceeds 50,000 character limit)';
        }

        res.json({
            success: true,
            text: extractedText.trim(),
            fileName: originalName,
            charCount: extractedText.trim().length
        });
    } catch (err) {
        // Cleanup on error
        try { if (req.file?.path) fs.unlinkSync(req.file.path); } catch (e) { /* ignore */ }
        console.error('[KNOWLEDGE FILE] Parse error:', err);
        res.status(500).json({ error: err.message || 'Failed to parse file.' });
    }
});

module.exports = router;
