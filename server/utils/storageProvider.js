/**
 * Storage Provider — Unified upload middleware for Local + S3
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

// Use memory storage so we can compress before persisting
const memoryUploader = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 200 * 1024 * 1024 } // 200MB max
});

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
 * Handles AWS S3, Cloudflare R2, Wasabi, MinIO, DigitalOcean Spaces.
 */
const buildS3Location = (s3Conf, endpoint, forcePathStyleVal, key) => {
    if (endpoint) {
        if (forcePathStyleVal) {
            // Path-style: https://endpoint/bucket/key (R2, Wasabi, MinIO)
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

const storageProvider = (folderName) => {
    return {
        single: (fieldName) => {
            return async (req, res, next) => {
                try {
                    // Step 1: Parse the upload into memory buffer
                    memoryUploader.single(fieldName)(req, res, async (err) => {
                        if (err) return next(err);

                        // No file uploaded (optional fields) — continue
                        if (!req.file) return next();

                        try {
                            // Step 2: Get storage config (local vs S3)
                            const storageConf = await getStorageConfig(folderName);

                            // Step 3: Compress image if applicable
                            let fileBuffer = req.file.buffer;
                            const originalSize = fileBuffer.length;

                            if (isCompressibleImage(req.file.mimetype)) {
                                const result = await compressImage(fileBuffer, req.file.mimetype);
                                fileBuffer = result.buffer;
                                if (result.compressed) {
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
