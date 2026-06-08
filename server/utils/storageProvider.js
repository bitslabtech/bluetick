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
 */

const multer = require('multer');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');
const SystemConfig = require('../models/SystemConfig');
const User = require('../models/User');
const { compressImage, isCompressibleImage } = require('./imageCompressor');

// Default limits if none provided
const DEFAULT_LIMITS = { fileSize: 200 * 1024 * 1024 }; // 200MB max

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

                        try {
                            // Step 2: Get storage config (local vs S3)
                            const storageConf = await getStorageConfig(folderName);

                            // Step 3: Compress image if applicable
                            let fileBuffer = req.file.buffer;
                            const originalSize = fileBuffer.length;

                            if (isCompressibleImage(req.file.mimetype)) {
                                const result = await compressImage(fileBuffer, req.file.mimetype, { convertToWebp: options.convertToWebp });
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

                            // Step 4: Generate unique filename
                            const uniqueSuffix = Date.now().toString() + '-' + Math.round(Math.random() * 1e9);

                            // Step 5: Save to storage
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
                            }

                            // Free the memory buffer — file is now persisted
                            delete req.file.buffer;

                            // Increment User Storage if authenticated
                            if (req.user && req.user.id && req.file.size) {
                                try {
                                    await User.increment('storageUsed', {
                                        by: req.file.size,
                                        where: { id: req.user.id }
                                    });
                                } catch (e) {
                                    console.error("Storage Tracking Error:", e);
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

module.exports = storageProvider;
module.exports.generalImageFilter = generalImageFilter;
module.exports.whatsappImageFilter = whatsappImageFilter;
module.exports.documentFilter = documentFilter;
module.exports.videoFilter = videoFilter;
module.exports.whatsappMediaFilter = whatsappMediaFilter;
