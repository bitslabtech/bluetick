/**
 * Storage Provider — Unified upload middleware for Local + S3 + Cloudflare R2
 * 
 * Handles file uploads with automatic image compression:
 * 1. Files are received into memory via multer
 * 2. Images (JPEG/PNG/WebP) are compressed using Sharp (60-80% size reduction)
 * 3. Files are saved to local disk or S3 depending on system config
 * 
 * All existing req.file properties (path, filename, location, key, publicUrl, size)
 * are preserved for full downstream compatibility.
 *
 * Security: Magic bytes validation prevents scripts/malware disguised as media files.
 */

const multer = require('multer');
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');
const SystemConfig = require('../models/SystemConfig');
const User = require('../models/User');
const Plan = require('../models/Plan');
const MediaFile = require('../models/MediaFile');
const { compressImage, isCompressibleImage } = require('./imageCompressor');

// ─────────────────────────────────────────────────────────────────────────────
// Magic Bytes Validation — Prevents disguised executable / malicious uploads
// ─────────────────────────────────────────────────────────────────────────────
const MAGIC_BYTES = {
    // Images
    'image/jpeg':  [{ offset: 0, bytes: [0xFF, 0xD8, 0xFF] }],
    'image/png':   [{ offset: 0, bytes: [0x89, 0x50, 0x4E, 0x47] }],
    'image/webp':  [{ offset: 0, bytes: [0x52, 0x49, 0x46, 0x46] }], // RIFF....WEBP
    'image/gif':   [{ offset: 0, bytes: [0x47, 0x49, 0x46, 0x38] }], // GIF8
    'image/svg+xml': null, // SVG is XML text, skip magic bytes check but validate content
    // Videos
    'video/mp4':   [
        { offset: 4, bytes: [0x66, 0x74, 0x79, 0x70] }, // ftyp box
        { offset: 0, bytes: [0x00, 0x00, 0x00] }        // fallback partial
    ],
    'video/webm':  [{ offset: 0, bytes: [0x1A, 0x45, 0xDF, 0xA3] }],
    'video/3gpp':  [{ offset: 4, bytes: [0x66, 0x74, 0x79, 0x70] }],
    // Documents
    'application/pdf': [{ offset: 0, bytes: [0x25, 0x50, 0x44, 0x46] }], // %PDF
    'text/csv':   null, // plain text, no magic bytes
    'text/plain': null,
    'text/markdown': null,
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [
        { offset: 0, bytes: [0x50, 0x4B, 0x03, 0x04] } // PK zip header (DOCX is ZIP)
    ]
};

/**
 * Validates that the buffer's magic bytes match the declared MIME type.
 * Returns null if valid, or an error string if invalid.
 */
const validateMagicBytes = (buffer, mimeType) => {
    const signatures = MAGIC_BYTES[mimeType];
    if (signatures === undefined) return 'Unsupported file type.';
    if (signatures === null) return null; // text files — no magic bytes
    if (!buffer || buffer.length < 8) return 'File too small or corrupt.';

    // For multi-signature types (e.g. MP4), any one match is sufficient
    const matched = signatures.some(sig => {
        if (buffer.length < sig.offset + sig.bytes.length) return false;
        return sig.bytes.every((byte, i) => buffer[sig.offset + i] === byte);
    });

    // Special WebP check: also verify WEBP marker at offset 8
    if (mimeType === 'image/webp' && matched) {
        const webpMarker = buffer.slice(8, 12).toString('ascii');
        if (webpMarker !== 'WEBP') return 'File content does not match WebP format.';
    }

    // SVG extra check — must not contain script tags
    if (mimeType === 'image/svg+xml') {
        const text = buffer.slice(0, Math.min(buffer.length, 4096)).toString('utf8').toLowerCase();
        if (text.includes('<script') || text.includes('javascript:') || text.includes('onload=') || text.includes('onerror=')) {
            return 'SVG file contains potentially dangerous content.';
        }
        return null;
    }

    return matched ? null : `File content does not match declared type (${mimeType}). Upload rejected for security.`;
};

/**
 * Classify a MIME type into a broad mediaType category.
 * Used to populate MediaFile.mediaType for gallery tab filtering.
 */
const classifyMediaType = (mimeType) => {
    if (!mimeType) return 'other';
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/') || mimeType.startsWith('audio/')) return 'video';
    if (
        mimeType === 'application/pdf' ||
        mimeType === 'text/csv' ||
        mimeType === 'text/plain' ||
        mimeType === 'text/markdown' ||
        mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        mimeType === 'application/msword' ||
        mimeType === 'application/vnd.ms-excel' ||
        mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ) return 'document';
    return 'other';
};

// Default limits if none provided
const DEFAULT_LIMITS = { fileSize: 200 * 1024 * 1024 }; // 200MB max

// ─── Folder-aware max image dimensions ──────────────────────────────────────
// Prevents uploading images far larger than their display size.
// Product cards: 308x205px display → cap at 800px wide (2.6x retina headroom)
// Hero slides:   707x350px display → cap at 1400px wide (2x retina headroom)
// Category imgs: ~200px display    → cap at 500px
// Logos:         ~134px display    → cap at 400px
// Default:       1200px (safe for most full-width uses)
const FOLDER_MAX_DIMENSIONS = {
    'wastore-products':  { maxWidth: 800,  maxHeight: 800  },
    'wastore-slides':    { maxWidth: 1400, maxHeight: 800  },
    'wastore-categories':{ maxWidth: 500,  maxHeight: 500  },
    'wastore-logos':     { maxWidth: 400,  maxHeight: 200  },
    'vcard':             { maxWidth: 1200, maxHeight: 1200 },
    'vcard-gallery':     { maxWidth: 1200, maxHeight: 1200 },
    'hero':              { maxWidth: 1400, maxHeight: 800  },
};
const getMaxDimensions = (folder) => FOLDER_MAX_DIMENSIONS[folder] || { maxWidth: 1200, maxHeight: 1200 };

/**
 * File Filters for Multer
 */
const generalImageFilter = (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only JPG, PNG, and WebP images are allowed.'));
    }
};

/**
 * Secure media gallery filter — accepts images + videos + documents.
 * MIME type is cross-checked against file extension. Magic bytes are
 * validated after multer parses the buffer to prevent spoofed uploads.
 */
const secureMediaFilter = (req, file, cb) => {
    // Allowed MIME types with their required extensions
    const ALLOWED = {
        'image/jpeg':  ['.jpg', '.jpeg'],
        'image/png':   ['.png'],
        'image/webp':  ['.webp'],
        'image/gif':   ['.gif'],
        'image/svg+xml': ['.svg'],
        'video/mp4':   ['.mp4'],
        'video/webm':  ['.webm'],
        'video/3gpp':  ['.3gp', '.3gpp'],
        'application/pdf': ['.pdf'],
        'text/csv':        ['.csv'],
        'text/plain':      ['.txt'],
        'text/markdown':   ['.md'],
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    };

    const allowedExts = ALLOWED[file.mimetype];
    if (!allowedExts) {
        return cb(new Error(`File type '${file.mimetype}' is not allowed. Permitted: images (JPG/PNG/WebP/GIF/SVG), videos (MP4/WebM), documents (PDF/CSV/TXT/DOCX).`));
    }

    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowedExts.includes(ext)) {
        return cb(new Error(`File extension '${ext}' does not match its declared type '${file.mimetype}'. Upload rejected.`));
    }

    // Magic bytes check is done post-buffer in the middleware (see Step 2b below)
    cb(null, true);
};

const whatsappImageFilter = (req, file, cb) => {
    // WhatsApp templates do not accept WebP
    const allowed = ['image/jpeg', 'image/png'];
    if (allowed.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('WhatsApp templates only support JPG and PNG images.'));
    }
};

const documentFilter = (req, file, cb) => {
    // Strictly define allowed document mimetypes
    const allowedMimeTypes = [
        'application/pdf', 
        'text/csv', 
        'text/plain', 
        'text/markdown', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    // Ensure the mimetype is explicitly allowed
    if (!allowedMimeTypes.includes(file.mimetype)) {
        return cb(new Error('Invalid file type. Only PDF, CSV, TXT, MD, and DOCX files are allowed.'));
    }

    // Double-check the extension matches the mimetype to prevent spoofing
    const ext = file.originalname.toLowerCase();
    if (
        (file.mimetype === 'application/pdf' && !ext.endsWith('.pdf')) ||
        (file.mimetype === 'text/csv' && !ext.endsWith('.csv')) ||
        (file.mimetype === 'text/plain' && !ext.endsWith('.txt')) ||
        (file.mimetype === 'text/markdown' && !ext.endsWith('.md')) ||
        (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' && !ext.endsWith('.docx'))
    ) {
        return cb(new Error('File extension does not match its content type.'));
    }

    cb(null, true);
};

const videoFilter = (req, file, cb) => {
    const allowed = ['video/mp4', 'video/3gpp'];
    if (allowed.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only MP4 and 3GP videos are allowed.'));
    }
};

const whatsappMediaFilter = (req, file, cb) => {
    // Allows whatsapp images, documents, and videos
    if (file.mimetype.startsWith('image/')) {
        return whatsappImageFilter(req, file, cb);
    } else if (file.mimetype.startsWith('video/')) {
        return videoFilter(req, file, cb);
    } else {
        return documentFilter(req, file, cb);
    }
};



/**
 * Reads the system config and returns the storage destination config.
 */
const getStorageConfig = async (folderName) => {
    const config = await SystemConfig.getCachedConfig();
    const storageConfig = config?.settings?.storage || { type: 'local' };

    if (storageConfig.type === 's3' && storageConfig.s3?.bucket && storageConfig.s3?.accessKeyId) {
        const s3Conf = storageConfig.s3;
        const endpoint = s3Conf.endpoint
            ? (s3Conf.endpoint.startsWith('http') ? s3Conf.endpoint : `https://${s3Conf.endpoint}`)
            : undefined;

        const forcePathStyleVal = s3Conf.forcePathStyle !== undefined
            ? (s3Conf.forcePathStyle === 'true' || s3Conf.forcePathStyle === true)
            : !!endpoint; // fallback to !!endpoint if not explicitly set

        const s3Client = new S3Client({
            region: s3Conf.region || 'us-east-1',
            credentials: {
                accessKeyId: s3Conf.accessKeyId,
                secretAccessKey: s3Conf.secretAccessKey,
            },
            endpoint: endpoint,
            forcePathStyle: forcePathStyleVal // Required for Wasabi / MinIO / DigitalOcean Spaces / R2
        });

        return { type: 's3', s3Client, s3Conf, endpoint, forcePathStyleVal, folderName };
    } else if (storageConfig.type === 'r2' && storageConfig.r2?.accountId && storageConfig.r2?.accessKeyId) {
        // ── Cloudflare R2 (separate from S3) ──
        const r2Conf = storageConfig.r2;
        const endpoint = `https://${r2Conf.accountId}.r2.cloudflarestorage.com`;

        const s3Client = new S3Client({
            region: 'auto',
            credentials: {
                accessKeyId: r2Conf.accessKeyId,
                secretAccessKey: r2Conf.secretAccessKey,
            },
            endpoint,
            forcePathStyle: true
        });

        return { type: 'r2', s3Client, r2Conf, endpoint, folderName };
    } else {
        const uploadDir = path.join(__dirname, '../public/uploads', folderName || '');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        return { type: 'local', uploadDir, folderName };
    }
};

/**
 * Builds the S3 public URL for an uploaded object.
 * Handles AWS S3, Wasabi, MinIO, DigitalOcean Spaces.
 */
const buildS3Location = (s3Conf, endpoint, forcePathStyleVal, key) => {
    if (endpoint) {
        if (forcePathStyleVal) {
            // Path-style: https://endpoint/bucket/key (Wasabi, MinIO)
            return `${endpoint}/${s3Conf.bucket}/${key}`;
        } else {
            // Virtual-hosted: https://bucket.endpoint/key (DO Spaces)
            const withBucket = endpoint.replace('://', `://${s3Conf.bucket}.`);
            return `${withBucket}/${key}`;
        }
    } else {
        // Standard AWS S3
        const region = s3Conf.region || 'us-east-1';
        return `https://${s3Conf.bucket}.s3.${region}.amazonaws.com/${key}`;
    }
};

/**
 * Builds the public URL for a Cloudflare R2 uploaded object.
 * Uses the user-configured publicUrl (custom domain or pub-xxx.r2.dev) if available,
 * otherwise falls back to the S3 API endpoint (which requires auth for private buckets).
 */
const buildR2Location = (r2Conf, endpoint, key) => {
    if (r2Conf.publicUrl) {
        const prefix = r2Conf.publicUrl.replace(/\/$/, '');
        return `${prefix}/${key}`;
    }
    // Fallback: S3 API path-style URL
    return `${endpoint}/${r2Conf.bucket}/${key}`;
};

const storageProvider = (folderName, options = {}) => {
    return {
        single: (fieldName) => {
            // Create uploader per route with custom limits/fileFilter
            const uploader = multer({
                storage: multer.memoryStorage(),
                limits: options.limits || DEFAULT_LIMITS,
                fileFilter: options.fileFilter || undefined
            });

            return async (req, res, next) => {
                try {
                    // Step 1: Parse the upload into memory buffer
                    uploader.single(fieldName)(req, res, async (err) => {
                        if (err) {
                            // Graceful multer error handling
                            if (err.code === 'LIMIT_FILE_SIZE') {
                                const limitBytes = options.limits?.fileSize || DEFAULT_LIMITS.fileSize;
                                const limitMB = (limitBytes / (1024 * 1024)).toFixed(0);
                                return res.status(413).json({
                                    error: `File too large. Maximum allowed size is ${limitMB}MB.`
                                });
                            }
                            // File filter rejection or other multer errors
                            if (err.message) {
                                return res.status(400).json({ error: err.message });
                            }
                            return next(err);
                        }

                        // No file uploaded (optional fields) — continue
                        if (!req.file) return next();

                        // ── Step 2b: Magic Bytes Validation (security hardening) ──────────────
                        // Validate that the buffer's actual bytes match the declared MIME type.
                        // This catches files that are renamed (e.g., malware.exe → image.jpg).
                        if (req.file.buffer && (options.fileFilter === secureMediaFilter || options.validateMagicBytes)) {
                            const magicError = validateMagicBytes(req.file.buffer, req.file.mimetype);
                            if (magicError) {
                                return res.status(400).json({ error: `Security check failed: ${magicError}` });
                            }
                        }

                        try {
                            // ── Step 2: Quota Check (trackMedia routes only) ───────────────────────
                            if (options.trackMedia && req.user && req.user.id) {
                                try {
                                    const [user, userPlan] = await Promise.all([
                                        User.findByPk(req.user.id, { attributes: ['id', 'plan', 'mediaStorageUsed'] }),
                                        Plan.findOne({ where: { name: req.user.plan }, attributes: ['storageLimitMb'] })
                                    ]);

                                    if (user && userPlan && userPlan.storageLimitMb > 0) {
                                        const usedBytes = Number(user.mediaStorageUsed || 0);
                                        const limitBytes = userPlan.storageLimitMb * 1024 * 1024;
                                        const incomingSize = req.file.size; // pre-compression size (conservative)

                                        if (usedBytes + incomingSize > limitBytes) {
                                            const usedMb = (usedBytes / (1024 * 1024)).toFixed(1);
                                            const limitMb = userPlan.storageLimitMb;
                                            return res.status(413).json({
                                                error: `Storage limit reached (${usedMb}MB / ${limitMb}MB). Please delete old media from the Gallery or upgrade your plan.`,
                                                storageQuotaExceeded: true
                                            });
                                        }
                                    }
                                } catch (quotaErr) {
                                    console.error('[Storage Quota Check] Error:', quotaErr.message);
                                    // Non-fatal — allow upload to proceed if quota check fails
                                }
                            }

                            // Step 3: Get storage config (local vs S3)
                            const storageConf = await getStorageConfig(folderName);

                            // Step 4: Compress image if applicable
                            let fileBuffer = req.file.buffer;
                            const originalSize = fileBuffer.length;

                            if (isCompressibleImage(req.file.mimetype)) {
                                const dims = getMaxDimensions(folderName);
                                const result = await compressImage(fileBuffer, req.file.mimetype, { convertToWebp: options.convertToWebp, ...dims });
                                fileBuffer = result.buffer;
                                if (result.compressed) {
                                    if (result.format === 'webp' && req.file.mimetype !== 'image/webp') {
                                        req.file.mimetype = 'image/webp';
                                        req.file.originalname = req.file.originalname.replace(/\.[^/.]+$/, "") + ".webp";
                                    }
                                    const savedPercent = Math.round((1 - result.compressedSize / result.originalSize) * 100);
                                    console.log(
                                        `[IMAGE COMPRESSOR] ${req.file.originalname}: ` +
                                        `${(result.originalSize / 1024).toFixed(0)}KB → ${(result.compressedSize / 1024).toFixed(0)}KB ` +
                                        `(${savedPercent}% saved)`
                                    );
                                }
                            }

                            // Step 5: Generate unique filename
                            const uniqueSuffix = Date.now().toString() + '-' + Math.round(Math.random() * 1e9);

                            // Step 6: Save to storage
                            let fileKey = null;
                            if (storageConf.type === 's3') {
                                // ── S3 Upload ──
                                const safeName = req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
                                const key = folderName
                                    ? `${folderName}/${uniqueSuffix}-${safeName}`
                                    : `${uniqueSuffix}-${safeName}`;

                                await storageConf.s3Client.send(new PutObjectCommand({
                                    Bucket: storageConf.s3Conf.bucket,
                                    Key: key,
                                    Body: fileBuffer,
                                    ContentType: req.file.mimetype,
                                    ACL: storageConf.s3Conf.acl || 'public-read',
                                    Metadata: { fieldName: req.file.fieldname }
                                }));

                                // Build S3 URL
                                const location = buildS3Location(
                                    storageConf.s3Conf,
                                    storageConf.endpoint,
                                    storageConf.forcePathStyleVal,
                                    key
                                );

                                // Set req.file properties (matching multerS3 output)
                                req.file.key = key;
                                req.file.location = location;
                                req.file.bucket = storageConf.s3Conf.bucket;
                                req.file.size = fileBuffer.length;
                                fileKey = key;

                                // Set publicUrl (prefer publicUrlPrefix if configured)
                                if (storageConf.s3Conf.publicUrlPrefix) {
                                    const prefix = storageConf.s3Conf.publicUrlPrefix.replace(/\/$/, '');
                                    req.file.publicUrl = `${prefix}/${key}`;
                                } else {
                                    req.file.publicUrl = location;
                                }

                            } else if (storageConf.type === 'r2') {
                                // ── Cloudflare R2 Upload (no ACL — R2 does not support it) ──
                                const safeName = req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
                                const key = folderName
                                    ? `${folderName}/${uniqueSuffix}-${safeName}`
                                    : `${uniqueSuffix}-${safeName}`;

                                await storageConf.s3Client.send(new PutObjectCommand({
                                    Bucket: storageConf.r2Conf.bucket,
                                    Key: key,
                                    Body: fileBuffer,
                                    ContentType: req.file.mimetype,
                                    Metadata: { fieldName: req.file.fieldname }
                                }));

                                // Build R2 URL
                                const location = buildR2Location(
                                    storageConf.r2Conf,
                                    storageConf.endpoint,
                                    key
                                );

                                // Set req.file properties
                                req.file.key = key;
                                req.file.location = location;
                                req.file.bucket = storageConf.r2Conf.bucket;
                                req.file.size = fileBuffer.length;
                                req.file.publicUrl = location;
                                fileKey = key;

                            } else {
                                // ── Local Disk Upload ──
                                const filename = uniqueSuffix + path.extname(req.file.originalname);
                                const filePath = path.join(storageConf.uploadDir, filename);

                                // Write buffer to disk
                                fs.writeFileSync(filePath, fileBuffer);

                                // Set req.file properties (matching multer diskStorage output)
                                req.file.path = filePath;
                                req.file.filename = filename;
                                req.file.destination = storageConf.uploadDir;
                                req.file.size = fileBuffer.length;

                                // Build publicUrl
                                const protocol = req.headers['x-forwarded-proto'] || req.protocol;
                                const host = req.headers['x-forwarded-host'] || req.get('host');
                                const subPath = folderName ? `${folderName}/${filename}` : filename;
                                req.file.publicUrl = `${protocol}://${host}/uploads/${subPath}`;
                                // For local, store the relative path for deletion
                                fileKey = subPath;
                            }

                            // Free the memory buffer — file is now persisted
                            delete req.file.buffer;
                            // Expose fileKey on req.file for route handlers
                            req.file.fileKey = fileKey;

                            // ── Step 7: Post-upload Tracking ──────────────────────────────────────
                            if (req.user && req.user.id && req.file.size) {
                                // Always increment global storageUsed
                                try {
                                    await User.increment('storageUsed', {
                                        by: req.file.size,
                                        where: { id: req.user.id }
                                    });
                                } catch (e) {
                                    console.error("Storage Tracking Error:", e);
                                }

                                // If trackMedia=true: quota-restricted upload (wastore / vcard)
                                // Increments mediaStorageUsed + creates MediaFile record
                                if (options.trackMedia) {
                                    try {
                                        await User.increment('mediaStorageUsed', {
                                            by: req.file.size,
                                            where: { id: req.user.id }
                                        });

                                        const mf = await MediaFile.create({
                                            userId: req.user.id,
                                            source: options.mediaSource || 'general_media',
                                            url: req.file.publicUrl,
                                            fileKey: fileKey,
                                            fileName: req.file.originalname,
                                            mimeType: req.file.mimetype,
                                            sizeBytes: req.file.size,
                                            folder: folderName || null,
                                            mediaType: classifyMediaType(req.file.mimetype)
                                        });
                                        console.log(`[Media Tracking] MediaFile created: id=${mf.id} source=${mf.source} type=${mf.mediaType} user=${req.user.id}`);
                                    } catch (e) {
                                        console.error("[Media Tracking] Error creating MediaFile record:", e.message);
                                    }
                                }

                                // If registerMedia=true (no quota): free/general upload
                                // Creates MediaFile record for gallery listing but does NOT
                                // touch mediaStorageUsed (quota counter is only for wastore/vcard)
                                if (options.registerMedia && !options.trackMedia) {
                                    try {
                                        const mf = await MediaFile.create({
                                            userId: req.user.id,
                                            source: options.mediaSource || 'general_media',
                                            url: req.file.publicUrl,
                                            fileKey: fileKey,
                                            fileName: req.file.originalname,
                                            mimeType: req.file.mimetype,
                                            sizeBytes: req.file.size,
                                            folder: folderName || null,
                                            mediaType: classifyMediaType(req.file.mimetype)
                                        });
                                        console.log(`[Media Register] MediaFile created: id=${mf.id} source=${mf.source} type=${mf.mediaType} user=${req.user.id}`);
                                    } catch (e) {
                                        console.error("[Media Register] Error creating MediaFile record:", e.message);
                                    }
                                }
                            }

                            next();
                        } catch (error) {
                            next(error);
                        }
                    });
                } catch (error) {
                    next(error);
                }
            };
        }
    };
};

// ─── Key extraction helpers (reverse of the URL-building functions above) ────

const extractR2Key = (url, r2Conf, endpoint) => {
    if (r2Conf.publicUrl) {
        const prefix = r2Conf.publicUrl.replace(/\/$/, '');
        if (url.startsWith(prefix + '/')) return url.slice(prefix.length + 1);
    }
    // fallback: endpoint/bucket/key
    const prefix = `${endpoint}/${r2Conf.bucket}/`;
    if (url.startsWith(prefix)) return url.slice(prefix.length);
    return null;
};

const extractS3Key = (url, s3Conf, endpoint, forcePathStyleVal) => {
    if (s3Conf.publicUrlPrefix) {
        const prefix = s3Conf.publicUrlPrefix.replace(/\/$/, '');
        if (url.startsWith(prefix + '/')) return url.slice(prefix.length + 1);
    }
    if (endpoint) {
        if (forcePathStyleVal) {
            const prefix = `${endpoint}/${s3Conf.bucket}/`;
            if (url.startsWith(prefix)) return url.slice(prefix.length);
        } else {
            const withBucket = endpoint.replace('://', `://${s3Conf.bucket}.`);
            const prefix = `${withBucket}/`;
            if (url.startsWith(prefix)) return url.slice(prefix.length);
        }
    }
    // Standard AWS S3
    const region = s3Conf.region || 'us-east-1';
    const awsPrefix = `https://${s3Conf.bucket}.s3.${region}.amazonaws.com/`;
    if (url.startsWith(awsPrefix)) return url.slice(awsPrefix.length);
    return null;
};

/**
 * Deletes a file from whichever storage backend is currently configured
 * (Cloudflare R2, AWS / S3-compatible, or local disk).
 *
 * Safe to call fire-and-forget — all errors are caught and logged.
 * @param {string} url - The public URL that was stored in the database.
 */
const deleteStorageFile = async (url) => {
    if (!url || typeof url !== 'string') return;
    try {
        const storageConf = await getStorageConfig();

        if (storageConf.type === 'r2') {
            const key = extractR2Key(url, storageConf.r2Conf, storageConf.endpoint);
            if (!key) { console.warn('[Storage] Could not extract R2 key from URL:', url); return; }
            await storageConf.s3Client.send(new DeleteObjectCommand({
                Bucket: storageConf.r2Conf.bucket,
                Key: key
            }));
            console.log('[Storage] Deleted R2 object:', key);

        } else if (storageConf.type === 's3') {
            const key = extractS3Key(url, storageConf.s3Conf, storageConf.endpoint, storageConf.forcePathStyleVal);
            if (!key) { console.warn('[Storage] Could not extract S3 key from URL:', url); return; }
            await storageConf.s3Client.send(new DeleteObjectCommand({
                Bucket: storageConf.s3Conf.bucket,
                Key: key
            }));
            console.log('[Storage] Deleted S3 object:', key);

        } else {
            // Local disk — extract path after /uploads/
            const match = url.match(/\/uploads\/(.+)/);
            if (!match) { console.warn('[Storage] Could not extract local path from URL:', url); return; }
            const filePath = path.join(__dirname, '../public/uploads', match[1]);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.log('[Storage] Deleted local file:', filePath);
            }
        }
    } catch (err) {
        // Non-fatal — log but never throw so callers stay unaffected
        console.error('[Storage] Failed to delete file:', url, err.message);
    }
};

/**
 * Processes and stores a raw buffer (compression + R2/Local save + tracking).
 * Designed for webhook / background usage without an express request.
 */
const processAndStoreBuffer = async (buffer, originalname, mimetype, folderName, userId, options = {}) => {
    const opt = { convertToWebp: false, registerMedia: true, trackMedia: false, mediaSource: 'inbox_media', ...options };
    const storageConf = await getStorageConfig(folderName);
    let fileBuffer = buffer;
    
    if (isCompressibleImage(mimetype)) {
        const dims = getMaxDimensions(folderName);
        const result = await compressImage(fileBuffer, mimetype, { convertToWebp: opt.convertToWebp, ...dims });
        fileBuffer = result.buffer;
        if (result.compressed && result.format === 'webp' && mimetype !== 'image/webp') {
            mimetype = 'image/webp';
            originalname = originalname.replace(/\.[^/.]+$/, "") + ".webp";
        }
    }

    const uniqueSuffix = Date.now().toString() + '-' + Math.round(Math.random() * 1e9);
    let publicUrl = null;
    let fileKey = null;
    let size = fileBuffer.length;

    if (storageConf.type === 's3') {
        const safeName = originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        const key = folderName ? `${folderName}/${uniqueSuffix}-${safeName}` : `${uniqueSuffix}-${safeName}`;
        await storageConf.s3Client.send(new PutObjectCommand({
            Bucket: storageConf.s3Conf.bucket,
            Key: key,
            Body: fileBuffer,
            ContentType: mimetype,
            ACL: storageConf.s3Conf.acl || 'public-read'
        }));
        const location = buildS3Location(storageConf.s3Conf, storageConf.endpoint, storageConf.forcePathStyleVal, key);
        if (storageConf.s3Conf.publicUrlPrefix) {
            const prefix = storageConf.s3Conf.publicUrlPrefix.replace(/\/$/, '');
            publicUrl = `${prefix}/${key}`;
        } else {
            publicUrl = location;
        }
        fileKey = key;
    } else if (storageConf.type === 'r2') {
        const safeName = originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        const key = folderName ? `${folderName}/${uniqueSuffix}-${safeName}` : `${uniqueSuffix}-${safeName}`;
        await storageConf.s3Client.send(new PutObjectCommand({
            Bucket: storageConf.r2Conf.bucket,
            Key: key,
            Body: fileBuffer,
            ContentType: mimetype
        }));
        publicUrl = buildR2Location(storageConf.r2Conf, storageConf.endpoint, key);
        fileKey = key;
    } else {
        const filename = uniqueSuffix + path.extname(originalname);
        const filePath = path.join(storageConf.uploadDir, filename);
        fs.writeFileSync(filePath, fileBuffer);
        const subPath = folderName ? `${folderName}/${filename}` : filename;
        const fallbackHost = process.env.VITE_API_URL || 'http://localhost:5000';
        publicUrl = `${fallbackHost.replace(/\/$/, '')}/uploads/${subPath}`;
        fileKey = subPath;
    }

    if (userId && size) {
        try { await User.increment('storageUsed', { by: size, where: { id: userId } }); } catch (e) { }
        if (opt.registerMedia || opt.trackMedia) {
            if (opt.trackMedia) {
                try { await User.increment('mediaStorageUsed', { by: size, where: { id: userId } }); } catch (e) {}
            }
            try {
                await MediaFile.create({
                    userId: userId,
                    source: opt.mediaSource,
                    url: publicUrl,
                    fileKey: fileKey,
                    fileName: originalname,
                    mimeType: mimetype,
                    sizeBytes: size,
                    folder: folderName || null,
                    mediaType: classifyMediaType(mimetype)
                });
            } catch (e) {
                console.error("[processAndStoreBuffer] MediaFile error:", e.message);
            }
        }
    }
    return publicUrl;
};

module.exports = storageProvider;
module.exports.generalImageFilter = generalImageFilter;
module.exports.secureMediaFilter = secureMediaFilter;
module.exports.whatsappImageFilter = whatsappImageFilter;
module.exports.documentFilter = documentFilter;
module.exports.videoFilter = videoFilter;
module.exports.whatsappMediaFilter = whatsappMediaFilter;
module.exports.deleteStorageFile = deleteStorageFile;
module.exports.classifyMediaType = classifyMediaType;
module.exports.processAndStoreBuffer = processAndStoreBuffer;
module.exports.classifyMediaType = classifyMediaType;
module.exports.validateMagicBytes = validateMagicBytes;
