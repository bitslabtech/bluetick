/**
 * PNG to WebP Conversion Script for R2
 *
 * Converts all PNG images in target folders to WebP format.
 * Since the filename changes (.png → .webp), this script also:
 *   1. Uploads the new .webp file to R2
 *   2. Deletes the old .png file from R2
 *   3. Updates all database URLs automatically
 *
 * Run from server/ directory:
 *   node convert-png-to-webp.js --dry-run   (preview only, no changes)
 *   node convert-png-to-webp.js             (apply all changes)
 */

require('dotenv').config();
const { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const sharp = require('sharp');
const { Sequelize } = require('sequelize');

// ─── Folders to target for PNG → WebP conversion ─────────────────────────────
const TARGET_FOLDERS = [
    'wastore-products',
    'wastore-slides',
    'wastore-categories',
    'wastore-logos',
    'vcard',
    'vcard-gallery',
    'hero',
];

// ─── Folder-aware max dimensions (same as storageProvider.js) ────────────────
const FOLDER_MAX_DIMENSIONS = {
    'wastore-products':   { maxWidth: 800,  maxHeight: 800  },
    'wastore-slides':     { maxWidth: 1400, maxHeight: 800  },
    'wastore-categories': { maxWidth: 500,  maxHeight: 500  },
    'wastore-logos':      { maxWidth: 400,  maxHeight: 200  },
    'vcard':              { maxWidth: 1200, maxHeight: 1200 },
    'vcard-gallery':      { maxWidth: 1200, maxHeight: 1200 },
    'hero':               { maxWidth: 1400, maxHeight: 800  },
};
const DEFAULT_DIMS = { maxWidth: 1200, maxHeight: 1200 };

// ─── Args ─────────────────────────────────────────────────────────────────────
const DRY_RUN = process.argv.includes('--dry-run');

// ─── DB connection ────────────────────────────────────────────────────────────
async function getConnections() {
    const sequelize = new Sequelize(
        process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASS,
        { host: process.env.DB_HOST || 'localhost', dialect: 'postgres', logging: false }
    );
    const [rows] = await sequelize.query('SELECT settings FROM "SystemConfigs" WHERE id = 1 LIMIT 1');
    if (!rows.length) throw new Error('SystemConfig not found');
    const r2 = rows[0].settings?.storage?.r2;
    if (!r2?.accountId || !r2?.accessKeyId) throw new Error('R2 config not found in SystemConfig');
    return { sequelize, r2Conf: r2 };
}

// ─── Stream to buffer ─────────────────────────────────────────────────────────
async function streamToBuffer(stream) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        stream.on('data', c => chunks.push(c));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
        stream.on('error', reject);
    });
}

// ─── Update all DB URLs (text + JSON columns) ─────────────────────────────────
async function updateDatabaseUrls(sequelize, oldUrl, newUrl) {
    // Tables and their columns that may contain image URLs
    const targets = [
        // Text columns
        { table: 'MediaFiles',  col: 'url',          type: 'text' },
        { table: 'WaStores',    col: 'logo',          type: 'text' },
        { table: 'WaStores',    col: 'coverImage',    type: 'text' },
        { table: 'Vcards',      col: 'profileImage',  type: 'text' },
        { table: 'Vcards',      col: 'coverImage',    type: 'text' },
        { table: 'Settings',    col: 'logoUrl',       type: 'text' },
        { table: 'Settings',    col: 'faviconUrl',    type: 'text' },
        { table: 'Settings',    col: 'registerBannerUrl', type: 'text' },
        { table: 'Addons',      col: 'bannerUrl',     type: 'text' },
        // JSON columns
        { table: 'WaProducts',  col: 'imageUrls',     type: 'json' },
        { table: 'WaStores',    col: 'heroSlides',    type: 'json' },
        { table: 'WaStores',    col: 'categoryImages',type: 'json' },
        { table: 'Vcards',      col: 'heroMedia',     type: 'json' },
        { table: 'Vcards',      col: 'gallery',       type: 'json' },
        { table: 'Vcards',      col: 'products',      type: 'json' },
        { table: 'Vcards',      col: 'services',      type: 'json' },
        { table: 'Vcards',      col: 'testimonials',  type: 'json' },
        { table: 'LandingPages',col: 'hero',          type: 'json' },
        { table: 'LandingPages',col: 'capabilities',  type: 'json' },
        { table: 'LandingPages',col: 'advancedFeatures', type: 'json' },
        { table: 'LandingPages',col: 'brand',         type: 'json' },
        { table: 'ChatMessages',col: 'templateData',  type: 'json' },
        { table: 'SystemConfigs',col: 'settings',     type: 'json' },
    ];

    let totalUpdated = 0;
    for (const { table, col, type } of targets) {
        try {
            let sql;
            if (type === 'json') {
                sql = `UPDATE "${table}" SET "${col}" = CAST(REPLACE(CAST("${col}" AS text), :old, :new) AS json) WHERE CAST("${col}" AS text) LIKE :pattern`;
            } else {
                sql = `UPDATE "${table}" SET "${col}" = REPLACE("${col}", :old, :new) WHERE "${col}" LIKE :pattern`;
            }
            const [, meta] = await sequelize.query(sql, {
                replacements: { old: oldUrl, new: newUrl, pattern: `%${oldUrl}%` }
            });
            const count = meta?.rowCount || 0;
            if (count > 0) {
                console.log(`  DB: Updated ${count} row(s) in ${table}.${col}`);
                totalUpdated += count;
            }
        } catch (e) {
            // Table or column might not exist — skip silently
        }
    }
    return totalUpdated;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
    console.log('Loading R2 config and DB connection...');
    const { sequelize, r2Conf } = await getConnections();

    const s3 = new S3Client({
        region: 'auto',
        credentials: { accessKeyId: r2Conf.accessKeyId, secretAccessKey: r2Conf.secretAccessKey },
        endpoint: `https://${r2Conf.accountId}.r2.cloudflarestorage.com`,
        forcePathStyle: true
    });

    const BUCKET = r2Conf.bucket;
    const PUBLIC_URL_BASE = (r2Conf.publicUrl || '').replace(/\/$/, '');

    console.log(`Bucket: ${BUCKET}`);
    console.log(`CDN Base: ${PUBLIC_URL_BASE}`);
    console.log(DRY_RUN ? 'DRY RUN - no changes will be made\n' : 'LIVE MODE - changes will be applied\n');

    // List all PNG files in target folders
    let pngKeys = [];
    for (const folder of TARGET_FOLDERS) {
        let continuationToken;
        do {
            const res = await s3.send(new ListObjectsV2Command({
                Bucket: BUCKET, Prefix: `${folder}/`, ContinuationToken: continuationToken
            }));
            const folderPngs = (res.Contents || [])
                .map(obj => obj.Key)
                .filter(k => /\.png$/i.test(k));
            pngKeys.push(...folderPngs);
            continuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
        } while (continuationToken);
    }

    console.log(`Found ${pngKeys.length} PNG files across ${TARGET_FOLDERS.length} folders\n`);

    let converted = 0, failed = 0;

    for (const pngKey of pngKeys) {
        const webpKey = pngKey.replace(/\.png$/i, '.webp');
        const folder = pngKey.split('/')[0];
        const dims = FOLDER_MAX_DIMENSIONS[folder] || DEFAULT_DIMS;

        const oldUrl = `${PUBLIC_URL_BASE}/${pngKey}`;
        const newUrl = `${PUBLIC_URL_BASE}/${webpKey}`;

        try {
            // Download PNG
            const getRes = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: pngKey }));
            const pngBuffer = await streamToBuffer(getRes.Body);
            const originalSize = pngBuffer.length;

            // Convert PNG → WebP (with resize)
            const webpBuffer = await sharp(pngBuffer)
                .rotate()
                .resize(dims.maxWidth, dims.maxHeight, { fit: 'inside', withoutEnlargement: true })
                .webp({ quality: 82 })
                .toBuffer();

            const savedKb = ((originalSize - webpBuffer.length) / 1024).toFixed(0);
            const pct = Math.round((1 - webpBuffer.length / originalSize) * 100);

            if (DRY_RUN) {
                console.log(`WOULD CONVERT: ${pngKey}`);
                console.log(`  ${(originalSize/1024).toFixed(0)}KB PNG → ${(webpBuffer.length/1024).toFixed(0)}KB WebP (saves ${savedKb}KB / ${pct}%)`);
                console.log(`  DB: ${oldUrl}`);
                console.log(`   → ${newUrl}`);
            } else {
                // 1. Upload WebP
                await s3.send(new PutObjectCommand({
                    Bucket: BUCKET, Key: webpKey, Body: webpBuffer, ContentType: 'image/webp'
                }));

                // 2. Delete old PNG
                await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: pngKey }));

                // 3. Update database
                const dbUpdates = await updateDatabaseUrls(sequelize, oldUrl, newUrl);

                console.log(`CONVERTED: ${pngKey} → ${webpKey}`);
                console.log(`  ${(originalSize/1024).toFixed(0)}KB → ${(webpBuffer.length/1024).toFixed(0)}KB (saved ${savedKb}KB / ${pct}%) | DB rows updated: ${dbUpdates}`);
            }
            converted++;

        } catch (err) {
            console.error(`FAILED: ${pngKey}: ${err.message}`);
            failed++;
        }
    }

    await sequelize.close();

    console.log('\n-------------------------------------');
    console.log(`Converted: ${converted}`);
    console.log(`Failed: ${failed}`);
    if (DRY_RUN) {
        console.log('\nDry run done. Run without --dry-run to apply changes.');
        console.log('After running live, purge Cloudflare cache: Caching -> Cache Purge -> Purge Everything');
    } else {
        console.log('\nDone! Remember to:');
        console.log('1. Purge Cloudflare cache: Caching -> Cache Purge -> Purge Everything');
    }
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
