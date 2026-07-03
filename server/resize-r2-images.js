/**
 * One-time R2 Image Resize Script
 * 
 * Downloads every image from R2, resizes it to its folder-appropriate
 * max dimensions using Sharp, then overwrites the same R2 key.
 * No database changes needed — URLs stay identical.
 * 
 * Run from server/ directory:
 *   node resize-r2-images.js
 *   node resize-r2-images.js --dry-run   (preview only, no changes)
 *   node resize-r2-images.js --folder wastore-products  (single folder only)
 */

require('dotenv').config();
const { S3Client, GetObjectCommand, PutObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const sharp = require('sharp');

// Folder-aware max dimensions — must stay in sync with storageProvider.js
// Set to 2× the maximum CSS display size (retina-ready via Sharp on upload).
const FOLDER_MAX_DIMENSIONS = {
    'wastore-products':   { maxWidth: 700,  maxHeight: 700  },
    'wastore-slides':     { maxWidth: 1200, maxHeight: 700  },
    'wastore-categories': { maxWidth: 400,  maxHeight: 400  },
    'wastore-logos':      { maxWidth: 300,  maxHeight: 150  },
    'vcard':              { maxWidth: 1200, maxHeight: 1200 },
    'vcard-gallery':      { maxWidth: 1200, maxHeight: 1200 },
    'hero':               { maxWidth: 1400, maxHeight: 800  },
};
const DEFAULT_DIMS = { maxWidth: 1200, maxHeight: 1200 };

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const FOLDER_FILTER = args.includes('--folder') ? args[args.indexOf('--folder') + 1] : null;

async function getR2Config() {
    const { Sequelize } = require('sequelize');
    const sequelize = new Sequelize(
        process.env.DB_NAME,
        process.env.DB_USER,
        process.env.DB_PASS,
        { host: process.env.DB_HOST || 'localhost', dialect: 'postgres', logging: false }
    );
    const [rows] = await sequelize.query('SELECT settings FROM "SystemConfigs" WHERE id = 1 LIMIT 1');
    await sequelize.close();
    if (!rows.length) throw new Error('SystemConfig not found in DB');
    const r2 = rows[0].settings?.storage?.r2;
    if (!r2?.accountId || !r2?.accessKeyId) throw new Error('R2 config not found in SystemConfig.settings.storage.r2');
    return r2;
}

async function streamToBuffer(stream) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        stream.on('data', chunk => chunks.push(chunk));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
        stream.on('error', reject);
    });
}

function getFolderFromKey(key) {
    return key.includes('/') ? key.split('/')[0] : null;
}

function isImage(key) {
    return /\.(jpg|jpeg|png|webp)$/i.test(key);
}

async function main() {
    console.log('Loading R2 config from database...');
    const r2Conf = await getR2Config();

    const s3 = new S3Client({
        region: 'auto',
        credentials: { accessKeyId: r2Conf.accessKeyId, secretAccessKey: r2Conf.secretAccessKey },
        endpoint: `https://${r2Conf.accountId}.r2.cloudflarestorage.com`,
        forcePathStyle: true
    });

    const BUCKET = r2Conf.bucket;
    console.log(`Bucket: ${BUCKET}`);
    console.log(DRY_RUN ? 'DRY RUN - no changes will be made\n' : 'LIVE MODE - images will be overwritten\n');

    let allKeys = [];
    let continuationToken = undefined;
    do {
        const res = await s3.send(new ListObjectsV2Command({
            Bucket: BUCKET,
            ContinuationToken: continuationToken,
            Prefix: FOLDER_FILTER || undefined
        }));
        allKeys.push(...(res.Contents || []).map(obj => obj.Key));
        continuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
    } while (continuationToken);

    const imageKeys = allKeys.filter(k => isImage(k));
    console.log(`Found ${imageKeys.length} image files\n`);

    let resized = 0, skipped = 0, failed = 0;

    for (const key of imageKeys) {
        const folder = getFolderFromKey(key);
        const dims = FOLDER_MAX_DIMENSIONS[folder] || DEFAULT_DIMS;

        try {
            const getRes = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
            const originalBuffer = await streamToBuffer(getRes.Body);
            const originalSize = originalBuffer.length;
            const meta = await sharp(originalBuffer).metadata();
            const { width, height } = meta;

            if (width <= dims.maxWidth && height <= dims.maxHeight) {
                console.log(`SKIP  ${key} (${width}x${height} - already within limits)`);
                skipped++;
                continue;
            }

            const ext = key.split('.').pop().toLowerCase();
            const mimeMap = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
            const mime = mimeMap[ext] || 'image/jpeg';

            let pipeline = sharp(originalBuffer).rotate().resize(dims.maxWidth, dims.maxHeight, {
                fit: 'inside', withoutEnlargement: true
            });

            let resizedBuffer;
            if (mime === 'image/jpeg') resizedBuffer = await pipeline.jpeg({ quality: 82, mozjpeg: true }).toBuffer();
            else if (mime === 'image/png') resizedBuffer = await pipeline.png({ compressionLevel: 8 }).toBuffer();
            else resizedBuffer = await pipeline.webp({ quality: 82 }).toBuffer();

            const newMeta = await sharp(resizedBuffer).metadata();
            const savedKb = ((originalSize - resizedBuffer.length) / 1024).toFixed(0);

            if (DRY_RUN) {
                console.log(`WOULD RESIZE  ${key}`);
                console.log(`  ${width}x${height} -> ${newMeta.width}x${newMeta.height} | ${(originalSize/1024).toFixed(0)}KB -> ${(resizedBuffer.length/1024).toFixed(0)}KB (saves ${savedKb}KB)`);
            } else {
                await s3.send(new PutObjectCommand({
                    Bucket: BUCKET, Key: key, Body: resizedBuffer, ContentType: mime
                }));
                console.log(`RESIZED  ${key}`);
                console.log(`  ${width}x${height} -> ${newMeta.width}x${newMeta.height} | ${(originalSize/1024).toFixed(0)}KB -> ${(resizedBuffer.length/1024).toFixed(0)}KB (saved ${savedKb}KB)`);
            }
            resized++;

        } catch (err) {
            console.error(`FAILED  ${key}: ${err.message}`);
            failed++;
        }
    }

    console.log('\n-------------------------------------');
    console.log(`Resized: ${resized}`);
    console.log(`Skipped (already small): ${skipped}`);
    console.log(`Failed: ${failed}`);
    console.log(DRY_RUN ? '\nDry run done. Remove --dry-run to apply.' : '\nDone! All images resized in R2.');
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
