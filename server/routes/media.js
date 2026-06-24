const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const MediaFile = require('../models/MediaFile');
const User = require('../models/User');
const Plan = require('../models/Plan');
const storageProvider = require('../utils/storageProvider');
const { Op, fn, col, literal } = require('sequelize');

// All routes require authentication
router.use(auth);

// Sources that count toward the plan storage quota
const QUOTA_SOURCES = ['wastore', 'vcard'];

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/media/usage — Returns two separate usage stats:
//   • restricted: vCard + Online Store combined (counts against plan quota)
//   • general:    Media Manager direct uploads (always unlimited)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/usage', async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            attributes: ['id', 'plan']
        });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const userPlan = await Plan.findOne({
            where: { name: user.plan || 'Free' },
            attributes: ['storageLimitMb', 'name']
        });

        // Sum sizeBytes from MediaFile for quota-tracked sources (wastore + vcard)
        const restrictedResult = await MediaFile.findOne({
            where: { userId: req.user.id, source: { [Op.in]: QUOTA_SOURCES } },
            attributes: [[fn('SUM', col('sizeBytes')), 'total']],
            raw: true
        });
        const restrictedBytes = Number(restrictedResult?.total || 0);

        // Sum sizeBytes for general uploads (gallery)
        const generalResult = await MediaFile.findOne({
            where: { userId: req.user.id, source: { [Op.notIn]: QUOTA_SOURCES } },
            attributes: [[fn('SUM', col('sizeBytes')), 'total']],
            raw: true
        });
        const generalBytes = Number(generalResult?.total || 0);

        // Total across all files
        const totalBytes = restrictedBytes + generalBytes;

        // Plan limit
        const limitMb = userPlan?.storageLimitMb ?? 100;
        const limitBytes = limitMb === 0 ? Infinity : limitMb * 1024 * 1024;
        const unlimited = limitMb === 0;
        const restrictedMb = restrictedBytes / (1024 * 1024);
        const generalMb = generalBytes / (1024 * 1024);
        const percentage = unlimited
            ? 0
            : Math.min(100, (restrictedMb / limitMb) * 100);

        res.json({
            // Plan-restricted usage (wastore + vcard)
            restrictedBytes,
            restrictedMb: parseFloat(restrictedMb.toFixed(2)),
            limitMb,
            limitBytes: unlimited ? null : limitMb * 1024 * 1024,
            percentage: parseFloat(percentage.toFixed(1)),
            unlimited,
            // General (Media Manager) usage — always unlimited
            generalBytes,
            generalMb: parseFloat(generalMb.toFixed(2)),
            // Total
            totalBytes,
            totalMb: parseFloat((totalBytes / (1024 * 1024)).toFixed(2)),
        });
    } catch (error) {
        console.error('Media usage error:', error);
        res.status(500).json({ error: 'Failed to fetch storage usage' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/media — Paginated list of MediaFile records for the user
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const offset = (page - 1) * limit;
        const source = req.query.source; // optional filter: 'wastore' | 'vcard' | 'general_media'

        const where = { userId: req.user.id };
        if (source) where.source = source;

        const { count, rows } = await MediaFile.findAndCountAll({
            where,
            order: [['createdAt', 'DESC']],
            limit,
            offset
        });

        res.json({
            files: rows,
            total: count,
            page,
            totalPages: Math.ceil(count / limit)
        });
    } catch (error) {
        console.error('Media list error:', error);
        res.status(500).json({ error: 'Failed to fetch media files' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/media/upload — Upload media with dynamic quota handling
// - If ?source=wastore or vcard -> trackMedia: true (enforces plan quota)
// - Otherwise -> registerMedia: true (unrestricted gallery upload)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/upload', (req, res, next) => {
    const source = req.query.source;
    const isRestricted = QUOTA_SOURCES.includes(source);

    const uploadMiddleware = storageProvider('media-gallery', {
        fileFilter: storageProvider.generalImageFilter,
        convertToWebp: true,
        // If restricted, check quota and increment usage
        trackMedia: isRestricted,
        // If not restricted, just log it to gallery without quota check
        registerMedia: !isRestricted,
        mediaSource: isRestricted ? source : 'general_media'
    }).single('file');

    uploadMiddleware(req, res, next);
}, async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
        res.json({ url: req.file.publicUrl, size: req.file.size, mimeType: req.file.mimetype });
    } catch (error) {
        console.error('Media upload error:', error);
        res.status(500).json({ error: 'Upload failed' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/media/:id — Delete a specific media file
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
    try {
        const mediaFile = await MediaFile.findOne({
            where: { id: req.params.id, userId: req.user.id }
        });
        if (!mediaFile) return res.status(404).json({ error: 'Media file not found' });

        // Delete from storage (non-fatal)
        if (mediaFile.url) {
            await storageProvider.deleteStorageFile(mediaFile.url);
        }

        // Only decrement mediaStorageUsed for quota-tracked sources (wastore / vcard)
        if (QUOTA_SOURCES.includes(mediaFile.source) && mediaFile.sizeBytes && mediaFile.sizeBytes > 0) {
            const user = await User.findByPk(req.user.id, { attributes: ['id', 'mediaStorageUsed'] });
            if (user) {
                const newUsed = Math.max(0, Number(user.mediaStorageUsed || 0) - Number(mediaFile.sizeBytes));
                await User.update({ mediaStorageUsed: newUsed }, { where: { id: req.user.id } });
            }
        }

        // Remove DB record
        await mediaFile.destroy();

        res.json({ success: true, message: 'Media file deleted' });
    } catch (error) {
        console.error('Media delete error:', error);
        res.status(500).json({ error: 'Failed to delete media file' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/media — Bulk delete media files
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/', async (req, res) => {
    try {
        const { ids } = req.body;
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: 'No IDs provided' });
        }

        const files = await MediaFile.findAll({
            where: { id: { [Op.in]: ids }, userId: req.user.id }
        });

        if (files.length === 0) return res.status(404).json({ error: 'No files found' });

        // Delete from storage
        for (const file of files) {
            if (file.url) await storageProvider.deleteStorageFile(file.url);
        }

        // Sum bytes only from quota-tracked sources
        const restrictedDeletedSize = files
            .filter(f => QUOTA_SOURCES.includes(f.source))
            .reduce((sum, f) => sum + Number(f.sizeBytes || 0), 0);

        await MediaFile.destroy({ where: { id: { [Op.in]: ids }, userId: req.user.id } });

        // Decrement mediaStorageUsed only for restricted files
        if (restrictedDeletedSize > 0) {
            const user = await User.findByPk(req.user.id, { attributes: ['id', 'mediaStorageUsed'] });
            if (user) {
                const newUsed = Math.max(0, Number(user.mediaStorageUsed || 0) - restrictedDeletedSize);
                await User.update({ mediaStorageUsed: newUsed }, { where: { id: req.user.id } });
            }
        }

        res.json({ success: true, deleted: files.length });
    } catch (error) {
        console.error('Bulk delete error:', error);
        res.status(500).json({ error: 'Failed to delete media files' });
    }
});

module.exports = router;
