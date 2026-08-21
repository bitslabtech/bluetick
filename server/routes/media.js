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

        // Fix #8: Server-side filename search — allows searching across all pages, not just the current 50
        const search = req.query.search ? req.query.search.trim() : null;
        if (search) {
            where.fileName = { [Op.like]: `%${search}%` };
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
const WaStore = require('../models/WaStore');
const WaProduct = require('../models/WaProduct');
const Vcard = require('../models/Vcard');

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Find every place a given media URL is referenced
// Returns array of { type, id, label, detail }
// ─────────────────────────────────────────────────────────────────────────────
async function getFileUsages(url, userId) {
    const usages = [];

    // Fix #3: Fetch stores once and reuse for both product lookup and store-level field checks
    const allStores = await WaStore.findAll({ where: { userId } });
    const storeIds = allStores.map(s => s.id);
    const storeNameMap = {};
    allStores.forEach(s => { storeNameMap[s.id] = s.name || s.slug; });

    // ── WaProduct: imageUrls[] and ogImage ──
    if (storeIds.length > 0) {
        const products = await WaProduct.findAll({ where: { storeId: { [Op.in]: storeIds } } });
        for (const p of products) {
            const imgs = Array.isArray(p.imageUrls) ? p.imageUrls : [];
            if (imgs.includes(url)) {
                usages.push({ type: 'product_image', id: p.id, label: 'Product image', detail: p.name || 'Unnamed product', storeId: p.storeId, storeName: storeNameMap[p.storeId] });
            }
            if (p.ogImage === url) {
                usages.push({ type: 'product_og', id: p.id, label: 'Product SEO image', detail: p.name || 'Unnamed product', storeId: p.storeId, storeName: storeNameMap[p.storeId] });
            }
        }
    }

    // ── WaStore: logo, coverImage, seoImage, heroSlides, categoryImages ── (reuse allStores)
    for (const s of allStores) {
        if (s.logo === url)       usages.push({ type: 'store_logo',   id: s.id, label: 'Store logo',   detail: s.name || s.slug });
        if (s.coverImage === url) usages.push({ type: 'store_cover',  id: s.id, label: 'Store cover',  detail: s.name || s.slug });
        if (s.seoImage === url)   usages.push({ type: 'store_seo',    id: s.id, label: 'Store SEO image', detail: s.name || s.slug });

        const slides = Array.isArray(s.heroSlides) ? s.heroSlides : [];
        slides.forEach((slide, i) => {
            if (slide?.imageUrl === url)
                usages.push({ type: 'hero_slide', id: s.id, label: 'Hero slide', detail: slide.title || `Slide ${i + 1}` });
        });

        const catImgs = (typeof s.categoryImages === 'string' ? JSON.parse(s.categoryImages || '{}') : (s.categoryImages || {}));
        Object.entries(catImgs).forEach(([cat, catUrl]) => {
            if (catUrl === url)
                usages.push({ type: 'category_image', id: s.id, label: 'Category image', detail: cat });
        });
    }

    // ── Vcard: profileImage, coverImage, services[], portfolio[], testimonials[] ──
    const vcards = await Vcard.findAll({ where: { userId } });
    for (const v of vcards) {
        const vcName = v.name || v.slug || 'vCard';
        if (v.profileImage === url) usages.push({ type: 'vcard_profile', id: v.id, label: 'vCard profile image', detail: vcName });
        if (v.coverImage === url)   usages.push({ type: 'vcard_cover',   id: v.id, label: 'vCard cover image',   detail: vcName });

        const arrayFields = [
            { field: v.services,     key: 'services',     label: 'vCard service' },
            { field: v.portfolio,    key: 'portfolio',    label: 'vCard portfolio item' },
            { field: v.testimonials, key: 'testimonials', label: 'vCard testimonial' },
        ];
        for (const { field, label } of arrayFields) {
            const arr = Array.isArray(field) ? field : [];
            arr.forEach(item => {
                if (item?.imageUrl === url)
                    usages.push({ type: 'vcard_section', id: v.id, label, detail: item.title || item.name || vcName });
            });
        }
    }

    return usages;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Remove a URL from all places it is referenced
// ─────────────────────────────────────────────────────────────────────────────
async function scrubFileUsages(url, userId) {
    // Fix #3: Fetch stores once, reuse for both products and store-level field scrub
    const allStores = await WaStore.findAll({ where: { userId } });
    const storeIds = allStores.map(s => s.id);

    // ── WaProduct ──
    if (storeIds.length > 0) {
        const products = await WaProduct.findAll({ where: { storeId: { [Op.in]: storeIds } } });
        for (const p of products) {
            let dirty = false;
            const imgs = Array.isArray(p.imageUrls) ? p.imageUrls : [];
            const newImgs = imgs.filter(u => u !== url);
            if (newImgs.length !== imgs.length) { p.imageUrls = newImgs; dirty = true; }
            if (p.ogImage === url) { p.ogImage = null; dirty = true; }
            if (dirty) await p.save();
        }
    }

    // ── WaStore (reuse allStores fetched above) ──
    for (const s of allStores) {
        let dirty = false;
        if (s.logo === url)       { s.logo = null; dirty = true; }
        if (s.coverImage === url) { s.coverImage = null; dirty = true; }
        if (s.seoImage === url)   { s.seoImage = null; dirty = true; }

        const slides = Array.isArray(s.heroSlides) ? s.heroSlides : [];
        const newSlides = slides.filter(slide => slide?.imageUrl !== url);
        if (newSlides.length !== slides.length) { s.heroSlides = newSlides; dirty = true; }

        // Fix #7: Remove the key entirely (delete) instead of setting to null,
        // so no ghost null-value entry remains in the categoryImages JSON
        const catImgs = (typeof s.categoryImages === 'string' ? JSON.parse(s.categoryImages || '{}') : (s.categoryImages || {}));
        let catDirty = false;
        Object.keys(catImgs).forEach(cat => { if (catImgs[cat] === url) { delete catImgs[cat]; catDirty = true; } });
        if (catDirty) { s.categoryImages = catImgs; dirty = true; }

        if (dirty) await s.save();
    }

    // ── Vcard ──
    const vcards = await Vcard.findAll({ where: { userId } });
    for (const v of vcards) {
        let dirty = false;
        if (v.profileImage === url) { v.profileImage = null; dirty = true; }
        if (v.coverImage === url)   { v.coverImage = null; dirty = true; }

        const arrayFields = ['services', 'portfolio', 'testimonials'];
        for (const field of arrayFields) {
            const arr = Array.isArray(v[field]) ? v[field] : [];
            const newArr = arr.map(item => {
                if (item?.imageUrl === url) { return { ...item, imageUrl: null }; }
                return item;
            });
            if (JSON.stringify(newArr) !== JSON.stringify(arr)) { v[field] = newArr; dirty = true; }
        }

        if (dirty) await v.save();
    }
}

router.post('/upload', async (req, res, next) => {
    try {
        const source = req.query.source;
        // 'restricted' = vcard/wastore context (quota-enforced)
        const isRestricted = source === 'restricted' || RESTRICTED_SOURCES.includes(source);
        // Map to a valid DB ENUM value: 'restricted' → 'vcard', specific sources stay as-is
        const mediaSource = source === 'restricted' ? 'vcard'
            : (RESTRICTED_SOURCES.includes(source) ? source : 'general_media');

        // Security check for storeId
        if (req.query.storeId) {
            const store = await WaStore.findOne({ where: { id: req.query.storeId, userId: req.user.id } });
            if (!store) return res.status(404).json({ error: 'Store not found or unauthorized' });
            req.storeId = req.query.storeId;
        }

        // Security check for vcardId
        if (req.query.vcardId) {
            const Vcard = require('../models/Vcard');
            const vcard = await Vcard.findOne({ where: { id: req.query.vcardId, userId: req.user.id } });
            if (!vcard) return res.status(404).json({ error: 'Vcard not found or unauthorized' });
            req.vcardId = req.query.vcardId;
        }

        const folderName = req.query.mediaFolder || 'media-gallery';

        const uploadMiddleware = storageProvider(folderName, {
        // Use the security-hardened filter that accepts images + videos + docs
        // and cross-checks extension vs MIME type
        fileFilter: storageProvider.secureMediaFilter,
        // Enable post-buffer magic bytes validation
        validateMagicBytes: true,
        convertToWebp: isRestricted, // Convert to lossless WebP only for vCard/Store
        limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max for media gallery
        // If restricted, check quota and increment usage
        trackMedia: isRestricted,
        // If not restricted, just log it to gallery without quota check
        registerMedia: !isRestricted,
        mediaSource
    }).single('file');

    uploadMiddleware(req, res, next);
    } catch (err) {
        console.error('Pre-upload configuration error:', err);
        return res.status(500).json({ error: 'Internal server error during upload configuration' });
    }
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
// GET /api/media/:id/usages — Check where a media file is used
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:id/usages', async (req, res) => {
    try {
        const mediaFile = await MediaFile.findOne({
            where: { id: req.params.id, userId: req.user.id }
        });
        if (!mediaFile) return res.status(404).json({ error: 'Media file not found' });

        const usages = await getFileUsages(mediaFile.url, req.user.id);
        res.json({ usages });
    } catch (error) {
        console.error('Media usage check error:', error);
        res.status(500).json({ error: 'Failed to check file usages' });
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

        // Scrub the URL from all places it is referenced (products, stores, vcards)
        if (mediaFile.url) {
            await scrubFileUsages(mediaFile.url, req.user.id).catch(e => console.error('[Media] scrubFileUsages error:', e));
        }

        // Fix #1: Pass stored fileKey so the delete doesn't rely on fragile URL parsing
        if (mediaFile.url) {
            await storageProvider.deleteStorageFile(mediaFile.url, mediaFile.fileKey || null);
        }

        // Fix #6: Remove the redundant mediaStorageUsed counter decrement.
        // The GET /api/media/usage endpoint always queries the live SUM(sizeBytes)
        // from MediaFile records, so the usage bar stays accurate after the
        // MediaFile row is destroyed below — no counter to maintain.

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

        // Scrub URLs from all usages, then delete from storage
        // Fix #1: Pass stored fileKey to avoid fragile URL-based key parsing
        for (const file of files) {
            if (file.url) {
                await scrubFileUsages(file.url, req.user.id).catch(e => console.error('[Media] scrubFileUsages error:', e));
                await storageProvider.deleteStorageFile(file.url, file.fileKey || null);
            }
        }

        // Fix #6: No longer decrementing the mediaStorageUsed counter manually.
        // The /usage endpoint uses live SUM(sizeBytes) from MediaFile, which
        // is correct after the destroy() below — no manual counter needed.

        await MediaFile.destroy({ where: { id: { [Op.in]: ids }, userId: req.user.id } });

        res.json({ success: true, deleted: files.length });
    } catch (error) {
        console.error('Bulk delete error:', error);
        res.status(500).json({ error: 'Failed to delete media files' });
    }
});

module.exports = router;
