const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const TechPartner = require('../models/TechPartner');
const TechPartnerPayout = require('../models/TechPartnerPayout');
const User = require('../models/User');
const SystemNotification = require('../models/SystemNotification');
const SystemConfig = require('../models/SystemConfig');
const logActivity = require('../utils/logger');
const { Op } = require('sequelize');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Setup multer for Marketing Assets
const assetsDir = path.join(__dirname, '../public/uploads/tech-partners');
if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, assetsDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = crypto.randomBytes(6).toString('hex');
        cb(null, `tp-asset-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

const upload = multer({ 
    storage,
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB max
});

const superAdmin = [auth, admin];

// ─── Helper: compute commission amount ───────────────────────────────────────
const computeCommission = (partner, planPrice) => {
    if (partner.commissionType === 'percentage') {
        return Math.round((planPrice * partner.commissionValue / 100) * 100) / 100;
    }
    if (partner.commissionType === 'flat') {
        return partner.commissionValue;
    }
    // validity_months — store as numeric value (e.g. 2 months)
    return partner.commissionValue;
};

// ─── GET /api/admin/tech-partners ────────────────────────────────────────────
// List all tech partners
router.get('/', superAdmin, async (req, res) => {
    try {
        const partners = await TechPartner.findAll({ order: [['createdAt', 'DESC']] });

        // Attach signup counts from User table
        const result = await Promise.all(partners.map(async (p) => {
            const signups = await User.count({ where: { techPartnerId: p.id } });
            return { ...p.toJSON(), signups };
        }));

        res.json(result);
    } catch (err) {
        console.error('[TECH PARTNERS LIST]', err);
        res.status(500).json({ error: err.message });
    }
});

// ─── POST /api/admin/tech-partners ───────────────────────────────────────────
// Create a new tech partner
router.post('/', superAdmin, async (req, res) => {
    try {
        const { name, email, code, phoneNumber, commissionType, commissionValue, notes } = req.body;

        if (!name || !email || !code) {
            return res.status(400).json({ error: 'name, email and code are required.' });
        }

        // Ensure code is unique
        const existing = await TechPartner.findOne({ where: { code: code.toUpperCase() } });
        if (existing) {
            return res.status(409).json({ error: `Partner code "${code.toUpperCase()}" is already in use.` });
        }

        const partner = await TechPartner.create({
            name,
            email,
            code: code.toUpperCase(),
            phoneNumber: phoneNumber || null,
            commissionType: commissionType || 'percentage',
            commissionValue: parseFloat(commissionValue) || 20,
            notes: notes || null
        });

        await logActivity(req, 'Tech Partner Created', `Admin created Tech Partner: ${name} (${code})`);
        res.status(201).json(partner);
    } catch (err) {
        console.error('[TECH PARTNER CREATE]', err);
        res.status(500).json({ error: err.message });
    }
});

// ─── PUT /api/admin/tech-partners/:id ────────────────────────────────────────
// Update a tech partner
router.put('/:id', superAdmin, async (req, res) => {
    try {
        const partner = await TechPartner.findByPk(req.params.id);
        if (!partner) return res.status(404).json({ error: 'Tech Partner not found.' });

        const { name, email, code, phoneNumber, commissionType, commissionValue, enabled, notes } = req.body;

        if (code && code.toUpperCase() !== partner.code) {
            const conflict = await TechPartner.findOne({ where: { code: code.toUpperCase() } });
            if (conflict) return res.status(409).json({ error: `Code "${code.toUpperCase()}" is already taken.` });
            partner.code = code.toUpperCase();
        }

        if (name !== undefined) partner.name = name;
        if (email !== undefined) partner.email = email;
        if (phoneNumber !== undefined) partner.phoneNumber = phoneNumber;
        if (commissionType !== undefined) partner.commissionType = commissionType;
        if (commissionValue !== undefined) partner.commissionValue = parseFloat(commissionValue);
        if (enabled !== undefined) partner.enabled = enabled;
        if (notes !== undefined) partner.notes = notes;

        await partner.save();
        await logActivity(req, 'Tech Partner Updated', `Admin updated Tech Partner: ${partner.name}`);
        res.json(partner);
    } catch (err) {
        console.error('[TECH PARTNER UPDATE]', err);
        res.status(500).json({ error: err.message });
    }
});

// ─── DELETE /api/admin/tech-partners/:id ─────────────────────────────────────
// Delete a tech partner
router.delete('/:id', superAdmin, async (req, res) => {
    try {
        const partner = await TechPartner.findByPk(req.params.id);
        if (!partner) return res.status(404).json({ error: 'Tech Partner not found.' });

        await partner.destroy();
        await logActivity(req, 'Tech Partner Deleted', `Admin deleted Tech Partner: ${partner.name}`);
        res.json({ success: true, message: `Tech Partner "${partner.name}" deleted.` });
    } catch (err) {
        console.error('[TECH PARTNER DELETE]', err);
        res.status(500).json({ error: err.message });
    }
});

// ─── GET /api/admin/tech-partners/:id/payouts ────────────────────────────────
// View all payout records for a specific tech partner
router.get('/:id/payouts', superAdmin, async (req, res) => {
    try {
        const partner = await TechPartner.findByPk(req.params.id);
        if (!partner) return res.status(404).json({ error: 'Tech Partner not found.' });

        const payouts = await TechPartnerPayout.findAll({
            where: { techPartnerId: req.params.id },
            order: [['createdAt', 'DESC']]
        });

        // Attach user info for display
        const enriched = await Promise.all(payouts.map(async (p) => {
            const user = await User.findByPk(p.userId, { attributes: ['id', 'name', 'email'] });
            return { ...p.toJSON(), user };
        }));

        res.json({ partner, payouts: enriched });
    } catch (err) {
        console.error('[TECH PARTNER PAYOUTS]', err);
        res.status(500).json({ error: err.message });
    }
});

// ─── PUT /api/admin/tech-partners/:id/payouts/:payoutId/mark-paid ────────────
// Mark a payout as paid and deduct from partner's pending balance
router.put('/:id/payouts/:payoutId/mark-paid', superAdmin, async (req, res) => {
    try {
        const payout = await TechPartnerPayout.findByPk(req.params.payoutId);
        if (!payout) return res.status(404).json({ error: 'Payout record not found.' });

        payout.status = 'paid';
        payout.paidAt = new Date();
        if (req.body.adminNotes) payout.adminNotes = req.body.adminNotes;
        await payout.save();

        // Update partner's pending balance
        const partner = await TechPartner.findByPk(payout.techPartnerId);
        if (partner) {
            partner.pendingBalance = Math.max(0, (partner.pendingBalance || 0) - (payout.commissionAmount || 0));
            await partner.save();
        }

        await logActivity(req, 'Tech Partner Payout', `Marked payout ${payout.id} as paid (₹${payout.commissionAmount})`);
        res.json({ success: true, message: 'Payout marked as paid.' });
    } catch (err) {
        console.error('[MARK PAYOUT PAID]', err);
        res.status(500).json({ error: err.message });
    }
});

// ─── GET /api/admin/tech-partners/:id/signups ────────────────────────────────
// List all users attributted to this partner
router.get('/:id/signups', superAdmin, async (req, res) => {
    try {
        const users = await User.findAll({
            where: { techPartnerId: req.params.id },
            attributes: ['id', 'name', 'email', 'plan', 'planStatus', 'createdAt'],
            order: [['createdAt', 'DESC']]
        });
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── GET /api/admin/tech-partners/applications ───────────────────────────────
// List all users with pending tech partner applications
router.get('/applications', superAdmin, async (req, res) => {
    try {
        const users = await User.findAll({
            where: { techPartnerStatus: 'pending' },
            attributes: ['id', 'name', 'email', 'techPartnerNotes', 'createdAt']
        });
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── POST /api/admin/tech-partners/applications/:userId/approve ──────────────
// Approve a tech partner application
router.post('/applications/:userId/approve', superAdmin, async (req, res) => {
    try {
        const user = await User.findByPk(req.params.userId);
        if (!user || user.techPartnerStatus !== 'pending') {
            return res.status(404).json({ error: 'Pending application not found.' });
        }

        const { commissionType, commissionValue, code, phoneNumber } = req.body;

        // Create the TechPartner record
        const partner = await TechPartner.create({
            userId: user.id,
            name: user.name, // or from body
            email: user.email,
            code: code.toUpperCase(),
            phoneNumber: phoneNumber || null,
            commissionType: commissionType || 'percentage',
            commissionValue: parseFloat(commissionValue) || 20,
            notes: 'Approved via application'
        });

        // Update the user
        await user.update({ techPartnerStatus: 'approved' });

        // Notify the user
        await SystemNotification.create({
            recipient: user.email,
            target: 'Single User',
            type: 'Success',
            title: 'Tech Partner Application Approved 🎉',
            message: `Congratulations! Your B2B Tech Partner application has been approved. You can now access your partner dashboard to share your tracking link and earn a ${commissionType === 'percentage' ? `${commissionValue}%` : `₹${commissionValue}`} commission.`
        });

        await logActivity(req, 'Tech Partner Approved', `Admin approved application for: ${user.name}`);
        res.json({ success: true, partner });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── POST /api/admin/tech-partners/applications/:userId/reject ───────────────
// Reject a tech partner application
router.post('/applications/:userId/reject', superAdmin, async (req, res) => {
    try {
        const user = await User.findByPk(req.params.userId);
        if (!user || user.techPartnerStatus !== 'pending') {
            return res.status(404).json({ error: 'Pending application not found.' });
        }

        // Just update status
        await user.update({ techPartnerStatus: 'rejected' });

        // Notify the user
        await SystemNotification.create({
            recipient: user.email,
            target: 'Single User',
            type: 'Error',
            title: 'Tech Partner Application Update',
            message: 'Unfortunately, your Tech Partner application could not be approved at this time. Please reach out to support if you have any questions.'
        });

        await logActivity(req, 'Tech Partner Rejected', `Admin rejected application for: ${user.name}`);
        res.json({ success: true, message: 'Application rejected.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── POST /api/admin/tech-partners/assets ──────────────────────────────────────
router.post('/assets', superAdmin, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
        
        const { name } = req.body;
        if (!name) return res.status(400).json({ error: 'Asset name is required.' });

        const protocol = req.headers['x-forwarded-proto'] || req.protocol;
        const host = req.headers.host;
        const publicUrl = `${protocol}://${host}/uploads/tech-partners/${req.file.filename}`;

        // Determine type based on extension or mimetype
        let type = 'FILE';
        if (req.file.mimetype.startsWith('image/')) type = 'IMG';
        else if (req.file.mimetype.startsWith('video/')) type = 'VIDEO';
        else if (req.file.mimetype === 'application/pdf') type = 'PDF';
        else type = path.extname(req.file.originalname).replace('.', '').toUpperCase();
        
        const newAsset = {
            id: crypto.randomUUID(),
            name,
            url: publicUrl,
            type,
            filename: req.file.filename,
            size: req.file.size
        };

        const config = await SystemConfig.getConfig();
        const settings = config.settings || {};
        if (!settings.techPartnerProgram) settings.techPartnerProgram = {};
        if (!settings.techPartnerProgram.assets) settings.techPartnerProgram.assets = [];
        
        settings.techPartnerProgram.assets.push(newAsset);
        
        config.changed('settings', true);
        await config.save();

        await logActivity(req, 'Marketing Asset Uploaded', `Admin uploaded new Tech Partner asset: ${name}`);
        res.status(201).json(newAsset);
    } catch (err) {
        console.error('[ASSET UPLOAD ERROR]', err);
        res.status(500).json({ error: err.message });
    }
});

// ─── DELETE /api/admin/tech-partners/assets/:id ──────────────────────────────
router.delete('/assets/:id', superAdmin, async (req, res) => {
    try {
        const config = await SystemConfig.getConfig();
        const settings = config.settings || {};
        if (!settings.techPartnerProgram || !settings.techPartnerProgram.assets) {
            return res.status(404).json({ error: 'No assets found.' });
        }

        const assets = settings.techPartnerProgram.assets;
        const assetIndex = assets.findIndex(a => a.id === req.params.id);
        
        if (assetIndex === -1) {
            return res.status(404).json({ error: 'Asset not found.' });
        }

        const asset = assets[assetIndex];
        
        // Remove from filesystem if exists
        if (asset.filename) {
            const filePath = path.join(assetsDir, asset.filename);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        // Remove from config
        assets.splice(assetIndex, 1);
        config.changed('settings', true);
        await config.save();

        await logActivity(req, 'Marketing Asset Deleted', `Admin deleted Tech Partner asset: ${asset.name}`);
        res.json({ success: true, message: 'Asset deleted.' });
    } catch (err) {
        console.error('[ASSET DELETE ERROR]', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
module.exports.computeCommission = computeCommission;
