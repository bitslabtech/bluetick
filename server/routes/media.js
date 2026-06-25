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

// Sources that count toward the plan storage quota (must match DB ENUM exactly)
const QUOTA_SOURCES = ['wastore', 'vcard'];
// Frontend sends 'restricted' as the access mode, but DB only knows wastore/vcard
const RESTRICTED_SOURCES = ['wastore', 'vcard'];

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
            where: { userId: req.user.id, source: { [Op.in]: RESTRICTED_SOURCES } },
            attributes: [[fn('SUM', col('sizeBytes')), 'total']],
            raw: true
        });
        const restrictedBytes = Number(restrictedResult?.total || 0);

        // Sum sizeBytes for general uploads (gallery)
        const generalResult = await MediaFile.findOne({
            where: { userId: req.user.id, source: { [Op.notIn]: RESTRICTED_SOURCES } },
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

// Derives mediaType from mimeType or url for legacy rows that have null mediaType
function deriveMediaType(mimeType, url) {
    const mime = (mimeType || '').toLowerCase();
    const u = (url || '').toLowerCase();
    if (mime.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|svg|bmp|avif)(\?|$)/.test(u)) return 'image';
    if (mime.startsWith('video/') || /\.(mp4|webm|3gp|ogg|mov|avi)(\?|$)/.test(u)) return 'video';
    if (
        mime === 'application/pdf' ||
        mime.startsWith('text/') ||
        mime.includes('document') ||
        mime.includes('spreadsheet') ||
        /\.(pdf|csv|txt|docx|xlsx|md)(\?|$)/.test(u)
    ) return 'document';
    return 'other';
}

router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const offset = (page - 1) * limit;
        const source = req.query.source; // optional filter: 'wastore' | 'vcard' | 'general_media'

        const where = { userId: req.user.id };
        if (source) {
            if (source === 'restricted') {
                // 'restricted' is a frontend concept — map to actual DB ENUM values
                where.source = { [Op.in]: RESTRICTED_SOURCES };
            } else if (['wastore', 'vcard', 'general_media'].includes(source)) {
                where.source = source;
            }
            // ignore unknown source values to avoid ENUM errors
        }

        // Optional mediaType filter for gallery tabs: image | video | document
        // For legacy rows that have mediaType = NULL, derive from mimeType using OR clause
        const mediaType = req.query.mediaType;
        if (mediaType && ['image', 'video', 'document', 'other'].includes(mediaType)) {
            const mimePatterns = {
                image:    ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml', 'image/bmp', 'image/avif'],
                video:    ['video/mp4', 'video/webm', 'video/3gpp', 'video/ogg', 'video/quicktime'],
                document: ['application/pdf', 'text/csv', 'text/plain', 'text/markdown',
                           'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                           'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
                other:    []
            };
            const mimes = mimePatterns[mediaType] || [];

            // Match rows where mediaType is explicitly set correctly OR where mediaType
            // is null/misclassified-as-other but mimeType indicates the correct category.
            // Legacy rows before the mediaType feature have defaultValue 'other' set by Sequelize.
            where[Op.or] = [
                { mediaType },
                {
                    mediaType: { [Op.or]: [null, 'other'] },
                    ...(mimes.length > 0 ? { mimeType: { [Op.in]: mimes } } : {})
                }
            ];
            // Remove the simple mediaType filter if it was set (replaced by Op.or above)
        }

        const { count, rows } = await MediaFile.findAndCountAll({
            where,
            order: [['createdAt', 'DESC']],
            limit,
            offset
        });

        // ── Lazy backfill: classify mediaType for legacy rows with null or wrong 'other' value ──
        const needsBackfill = rows.filter(f => !f.mediaType || f.mediaType === 'other');
        if (needsBackfill.length > 0) {
            Promise.all(
                needsBackfill.map(f => {
                    const derived = deriveMediaType(f.mimeType, f.url);
                    // Only update if derived is more specific than 'other'
                    if (derived !== f.mediaType) {
                        return f.update({ mediaType: derived }).catch(() => {});
                    }
                })
            ).catch(() => {});
        }

        res.json({
            files: rows.map(f => ({
                ...f.toJSON(),
                // Always derive mediaType in the response — ensures correct tab categorisation
                // even before the async backfill writes to DB
                mediaType: (() => {
                    const derived = deriveMediaType(f.mimeType, f.url);
                    // Use stored value only if it is a specific, correct classification
                    return (f.mediaType && f.mediaType !== 'other') ? f.mediaType : derived;
                })()
            })),
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
    // 'restricted' = vcard/wastore context (quota-enforced)
    const isRestricted = source === 'restricted' || RESTRICTED_SOURCES.includes(source);
    // Map to a valid DB ENUM value: 'restricted' → 'vcard', specific sources stay as-is
    const mediaSource = source === 'restricted' ? 'vcard'
        : (RESTRICTED_SOURCES.includes(source) ? source : 'general_media');

    const uploadMiddleware = storageProvider('media-gallery', {
        // Use the security-hardened filter that accepts images + videos + docs
        // and cross-checks extension vs MIME type
        fileFilter: storageProvider.secureMediaFilter,
        // Enable post-buffer magic bytes validation
        validateMagicBytes: true,
        convertToWebp: false, // Don't force-convert; allow all accepted types
        limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max for media gallery
        // If restricted, check quota and increment usage
        trackMedia: isRestricted,
        // If not restricted, just log it to gallery without quota check
        registerMedia: !isRestricted,
        mediaSource
    }).single('file');

    uploadMiddleware(req, res, next);
}, async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });

        // ── Classify and save mediaType on the MediaFile record immediately ──
        // storageProvider may have already created the record; find and update it.
        if (req.file.mediaFileId) {
            const mf = await MediaFile.findByPk(req.file.mediaFileId);
            if (mf && (!mf.mediaType || mf.mediaType === 'other')) {
                const derived = deriveMediaType(req.file.mimetype, req.file.publicUrl);
                await mf.update({ mediaType: derived }).catch(() => {});
            }
        }

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
        if (RESTRICTED_SOURCES.includes(mediaFile.source) && mediaFile.sizeBytes && mediaFile.sizeBytes > 0) {
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
            .filter(f => RESTRICTED_SOURCES.includes(f.source))
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
