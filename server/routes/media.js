const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const MediaFile = require('../models/MediaFile');
const User = require('../models/User');
const Plan = require('../models/Plan');
const storageProvider = require('../utils/storageProvider');
const { Op } = require('sequelize');

// All routes require authentication
router.use(auth);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/media/usage — Returns current storage usage vs plan limit
// ─────────────────────────────────────────────────────────────────────────────
router.get('/usage', async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            attributes: ['id', 'plan', 'mediaStorageUsed']
        });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const userPlan = await Plan.findOne({
            where: { name: user.plan },
            attributes: ['storageLimitMb', 'name']
        });

        const usedBytes = Number(user.mediaStorageUsed || 0);
        const limitMb = userPlan?.storageLimitMb ?? 100;
        const limitBytes = limitMb * 1024 * 1024;
        const usedMb = usedBytes / (1024 * 1024);
        const percentage = limitMb === 0 ? 0 : Math.min(100, (usedMb / limitMb) * 100);

        res.json({
            usedBytes,
            usedMb: parseFloat(usedMb.toFixed(2)),
            limitMb,
            limitBytes,
            percentage: parseFloat(percentage.toFixed(1)),
            unlimited: limitMb === 0
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
// POST /api/media/upload — Direct upload via Media Gallery page
// ─────────────────────────────────────────────────────────────────────────────
router.post('/upload',
    storageProvider('media-gallery', {
        fileFilter: storageProvider.generalImageFilter,
        convertToWebp: true,
        trackMedia: true,
        mediaSource: 'general_media'
    }).single('file'),
    async (req, res) => {
        try {
            if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
            res.json({ url: req.file.publicUrl, size: req.file.size, mimeType: req.file.mimetype });
        } catch (error) {
            console.error('Media upload error:', error);
            res.status(500).json({ error: 'Upload failed' });
        }
    }
);

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

        // Decrement mediaStorageUsed
        if (mediaFile.sizeBytes && mediaFile.sizeBytes > 0) {
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

        let totalSize = 0;
        for (const file of files) {
            if (file.url) await storageProvider.deleteStorageFile(file.url);
            totalSize += Number(file.sizeBytes || 0);
        }

        await MediaFile.destroy({ where: { id: { [Op.in]: ids }, userId: req.user.id } });

        // Decrement mediaStorageUsed
        if (totalSize > 0) {
            const user = await User.findByPk(req.user.id, { attributes: ['id', 'mediaStorageUsed'] });
            if (user) {
                const newUsed = Math.max(0, Number(user.mediaStorageUsed || 0) - totalSize);
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
