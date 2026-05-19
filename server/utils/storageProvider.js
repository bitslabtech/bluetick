const multer = require('multer');
const { S3Client } = require('@aws-sdk/client-s3');
const multerS3 = require('multer-s3');
const fs = require('fs');
const path = require('path');
const SystemConfig = require('../models/SystemConfig');
const User = require('../models/User');

const createUploader = async (folderName) => {
    const config = await SystemConfig.getCachedConfig();
    const storageConfig = config?.settings?.storage || { type: 'local' };

    if (storageConfig.type === 's3' && storageConfig.s3?.bucket && storageConfig.s3?.accessKeyId) {
        const s3Conf = storageConfig.s3;
        const endpoint = s3Conf.endpoint ? (s3Conf.endpoint.startsWith('http') ? s3Conf.endpoint : `https://${s3Conf.endpoint}`) : undefined;
        
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
            forcePathStyle: forcePathStyleVal // Required for Wasabi / MinIO / DigitalOcean Spaces
        });

        const storage = multerS3({
            s3: s3Client,
            bucket: s3Conf.bucket,
            acl: s3Conf.acl || 'public-read',
            contentType: multerS3.AUTO_CONTENT_TYPE,
            metadata: function (req, file, cb) {
                cb(null, { fieldName: file.fieldname });
            },
            key: function (req, file, cb) {
                const uniqueSuffix = Date.now().toString() + '-' + Math.round(Math.random() * 1e9);
                const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
                const fullPath = folderName ? `${folderName}/${uniqueSuffix}-${safeName}` : `${uniqueSuffix}-${safeName}`;
                cb(null, fullPath);
            }
        });
        return { uploader: multer({ storage, limits: { fileSize: 200 * 1024 * 1024 } }), type: 's3', parsedConfig: s3Conf };
    } else {
        const uploadDir = path.join(__dirname, '../public/uploads', folderName || '');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        const storage = multer.diskStorage({
            destination: function (req, file, cb) {
                cb(null, uploadDir);
            },
            filename: function (req, file, cb) {
                const uniqueSuffix = Date.now().toString() + '-' + Math.round(Math.random() * 1e9);
                cb(null, uniqueSuffix + path.extname(file.originalname));
            }
        });
        return { uploader: multer({ storage, limits: { fileSize: 200 * 1024 * 1024 } }), type: 'local' };
    }
};

const storageProvider = (folderName) => {
    return {
        single: (fieldName) => {
            return async (req, res, next) => {
                try {
                    const { uploader, type, parsedConfig } = await createUploader(folderName);
                    uploader.single(fieldName)(req, res, async (err) => {
                        if (err) return next(err);
                        
                        // Wait if there is no file uploaded (optional fields)
                        if (req.file) {
                            if (type === 's3') {
                                // Prefer publicUrlPrefix if set
                                if (parsedConfig?.publicUrlPrefix) {
                                    const prefix = parsedConfig.publicUrlPrefix.replace(/\/$/, '');
                                    req.file.publicUrl = `${prefix}/${req.file.key}`;
                                } else {
                                    req.file.publicUrl = req.file.location;
                                }
                            } else {
                                // Local fallback logic
                                const protocol = req.headers['x-forwarded-proto'] || req.protocol;
                                const host = req.headers['x-forwarded-host'] || req.get('host');
                                const subPath = folderName ? `${folderName}/${req.file.filename}` : req.file.filename;
                                req.file.publicUrl = `${protocol}://${host}/uploads/${subPath}`;
                            }

                            // Increment User Storage if authenticated
                            if (req.user && req.user.id && req.file.size) {
                                try {
                                    await User.increment('storageUsed', { 
                                        by: req.file.size, 
                                        where: { id: req.user.id } 
                                    });
                                } catch(e) {
                                    console.error("Storage Tracking Error:", e);
                                }
                            }
                        }
                        
                        next();
                    });
                } catch (error) {
                    next(error);
                }
            };
        }
    };
};

module.exports = storageProvider;
