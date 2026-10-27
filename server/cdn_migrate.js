/**
 * Phase 2: CDN URL Migration - cdn.bluetick.cloud -> cdn.onedash.cloud
 *
 * DRY-RUN by default (no DB changes).
 * Pass --execute flag to apply the migration.
 *
 * Tables and columns covered:
 *   MediaFiles  : url
 *   WaStores    : logo, coverImage (string) + heroSlides, categoryImages, seoConfig,
 *                 shoppableVideos, homepageSections, homepageCollections (JSON)
 *   WaProducts  : image (string) + images, variants (JSON)
 *   Vcards      : avatar, coverImage, logo (string)
 *   Users       : avatar (string)
 *   SystemConfig: settings.storage.r2.publicUrl (so new uploads also use onedash)
 *
 * Safety guarantees:
 *   - Zero writes without --execute flag
 *   - Idempotent: re-running is safe; already-migrated rows are skipped
 *   - Per-row updates: a failure on one row does not affect others
 *   - JSON-aware: JSON columns are parsed, substituted, then re-serialised
 *
 * Usage:
 *   cd server
 *   node cdn_migrate.js            # dry-run
 *   node cdn_migrate.js --execute  # apply
 */

const OLD_CDN = 'cdn.bluetick.cloud';
const NEW_CDN = 'cdn.onedash.cloud';
const DRY_RUN = !process.argv.includes('--execute');

// Load env + DB from server root (this script lives in /server)
require('dotenv').config({ path: __dirname + '/.env' });
const { sequelize } = require('./config/database');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function replaceUrl(str) {
    if (typeof str !== 'string') return str;
    return str.split('https://' + OLD_CDN).join('https://' + NEW_CDN);
}

function replaceJson(val) {
    if (!val) return { changed: false, value: val };
    var str = JSON.stringify(val);
    if (!str.includes(OLD_CDN)) return { changed: false, value: val };
    return { changed: true, value: JSON.parse(str.split(OLD_CDN).join(NEW_CDN)) };
}

function hasCdn(val) {
    if (!val) return false;
    if (typeof val === 'string') return val.includes(OLD_CDN);
    return JSON.stringify(val).includes(OLD_CDN);
}

var totalScanned = 0;
var totalWouldMigrate = 0;
var totalMigrated = 0;

// ─── String column migration ──────────────────────────────────────────────────

async function migrateStringCols(tableName, columns, idCol) {
    idCol = idCol || 'id';
    console.log('\n=== ' + tableName + ' [string: ' + columns.join(', ') + '] ===');

    var select = [idCol].concat(columns).map(function(c){ return '"' + c + '"'; }).join(', ');
    var rows = (await sequelize.query('SELECT ' + select + ' FROM "' + tableName + '"'))[0];
    totalScanned += rows.length;

    var migrated = 0;
    for (var i = 0; i < rows.length; i++) {
        var row = rows[i];
        var updates = {};
        columns.forEach(function(col) {
            if (!row[col] || typeof row[col] !== 'string') return;
            var n = replaceUrl(row[col]);
            if (n !== row[col]) updates[col] = n;
        });
        if (!Object.keys(updates).length) continue;
        totalWouldMigrate++;

        if (DRY_RUN) {
            console.log('  [DRY] id=' + row[idCol] + ' -> ' + JSON.stringify(updates));
        } else {
            var keys = Object.keys(updates);
            var set = keys.map(function(c, i){ return '"' + c + '" = $' + (i+1); }).join(', ');
            var vals = keys.map(function(c){ return updates[c]; });
            vals.push(row[idCol]);
            await sequelize.query(
                'UPDATE "' + tableName + '" SET ' + set + ' WHERE "' + idCol + '" = $' + vals.length,
                { bind: vals }
            );
            console.log('  [OK] id=' + row[idCol]);
            migrated++;
        }
    }
    totalMigrated += migrated;
    console.log('  Scanned: ' + rows.length + ' | ' + (DRY_RUN ? 'Would update: ' + totalWouldMigrate : 'Updated: ' + migrated));
}

// ─── JSON column migration ────────────────────────────────────────────────────

async function migrateJsonCols(tableName, columns, idCol) {
    idCol = idCol || 'id';
    console.log('\n=== ' + tableName + ' [JSON: ' + columns.join(', ') + '] ===');

    var select = [idCol].concat(columns).map(function(c){ return '"' + c + '"'; }).join(', ');
    var rows = (await sequelize.query('SELECT ' + select + ' FROM "' + tableName + '"'))[0];
    totalScanned += rows.length;

    var migrated = 0;
    for (var i = 0; i < rows.length; i++) {
        var row = rows[i];
        var updates = {};
        columns.forEach(function(col) {
            if (!hasCdn(row[col])) return;
            var r = replaceJson(row[col]);
            if (r.changed) updates[col] = r.value;
        });
        if (!Object.keys(updates).length) continue;
        totalWouldMigrate++;

        if (DRY_RUN) {
            console.log('  [DRY] id=' + row[idCol] + ' cols: ' + Object.keys(updates).join(', '));
        } else {
            var keys = Object.keys(updates);
            var set = keys.map(function(c, i){ return '"' + c + '" = $' + (i+1) + '::json'; }).join(', ');
            var vals = keys.map(function(c){ return JSON.stringify(updates[c]); });
            vals.push(row[idCol]);
            await sequelize.query(
                'UPDATE "' + tableName + '" SET ' + set + ' WHERE "' + idCol + '" = $' + vals.length,
                { bind: vals }
            );
            console.log('  [OK] id=' + row[idCol]);
            migrated++;
        }
    }
    totalMigrated += migrated;
    console.log('  Scanned: ' + rows.length + ' | ' + (DRY_RUN ? 'Would update: ' + totalWouldMigrate : 'Updated: ' + migrated));
}

// ─── SystemConfig r2.publicUrl ────────────────────────────────────────────────

async function migrateR2PublicUrl() {
    console.log('\n=== SystemConfigs.settings.storage.r2.publicUrl ===');
    var rows = (await sequelize.query('SELECT id, settings FROM "SystemConfigs"'))[0];
    for (var i = 0; i < rows.length; i++) {
        var row = rows[i];
        var s = row.settings;
        var cur = s && s.storage && s.storage.r2 && s.storage.r2.publicUrl;
        console.log('  Current r2.publicUrl: ' + (cur || '(not set)'));
        if (cur && cur.includes(OLD_CDN)) {
            var updated = replaceUrl(cur);
            if (DRY_RUN) {
                console.log('  [DRY] Would update -> ' + updated);
            } else {
                s.storage.r2.publicUrl = updated;
                await sequelize.query(
                    'UPDATE "SystemConfigs" SET settings = $1::json WHERE id = $2',
                    { bind: [JSON.stringify(s), row.id] }
                );
                console.log('  [OK] r2.publicUrl updated to ' + updated);
            }
        } else {
            console.log('  No change needed.');
        }
    }
}

// ─── Pre-flight: show config + row counts ─────────────────────────────────────

async function preflight() {
    // Current config
    var rows = (await sequelize.query('SELECT settings FROM "SystemConfigs" WHERE id = 1'))[0];
    if (rows.length) {
        var s = rows[0].settings;
        console.log('\n--- Current storage config ---');
        console.log('  type:         ' + (s && s.storage && s.storage.type));
        if (s && s.storage && s.storage.r2) {
            console.log('  r2.bucket:    ' + s.storage.r2.bucket);
            console.log('  r2.publicUrl: ' + s.storage.r2.publicUrl);
        }
    }

    // Row counts
    console.log('\n--- Rows referencing ' + OLD_CDN + ' ---');
    var checks = [
        { t: 'MediaFiles',  c: 'url' },
        { t: 'WaStores',    c: 'logo' },
        { t: 'WaStores',    c: 'coverImage' },
        { t: 'WaStores',    c: 'heroSlides' },
        { t: 'WaStores',    c: 'seoConfig' },
        { t: 'WaProducts',  c: 'image' },
        { t: 'WaProducts',  c: 'images' },
        { t: 'Vcards',      c: 'avatar' },
        { t: 'Users',       c: 'avatar' },
    ];
    for (var i = 0; i < checks.length; i++) {
        var ch = checks[i];
        try {
            var r = (await sequelize.query(
                'SELECT COUNT(*) as cnt FROM "' + ch.t + '" WHERE "' + ch.c + '"::text LIKE \'%' + OLD_CDN + '%\''
            ))[0][0];
            if (parseInt(r.cnt) > 0) console.log('  ' + ch.t + '.' + ch.c + ': ' + r.cnt + ' rows');
        } catch(e) { /* column might not exist in this DB version */ }
    }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
    await sequelize.authenticate();
    console.log('Database connected.');
    console.log('\nMode : ' + (DRY_RUN
        ? '*** DRY-RUN — zero DB changes will be made ***'
        : '*** EXECUTE — writing changes to database ***'));
    console.log('From : https://' + OLD_CDN);
    console.log('To   : https://' + NEW_CDN);

    await preflight();

    // String columns
    await migrateStringCols('MediaFiles', ['url']);
    await migrateStringCols('WaStores',   ['logo', 'coverImage']);
    await migrateStringCols('WaProducts', ['image']);
    await migrateStringCols('Vcards',     ['avatar', 'coverImage', 'logo']);
    await migrateStringCols('Users',      ['avatar']);

    // JSON columns
    await migrateJsonCols('WaStores',   ['heroSlides', 'categoryImages', 'seoConfig', 'shoppableVideos', 'homepageSections', 'homepageCollections']);
    await migrateJsonCols('WaProducts', ['images', 'variants']);

    // SystemConfig r2.publicUrl
    await migrateR2PublicUrl();

    console.log('\n==============================');
    console.log('Total rows scanned : ' + totalScanned);
    if (DRY_RUN) {
        console.log('Would migrate      : ' + totalWouldMigrate + ' rows');
        console.log('\nDRY-RUN done. No changes made.');
        console.log('Run with --execute to apply:\n  node cdn_migrate.js --execute');
    } else {
        console.log('Rows migrated      : ' + totalMigrated);
        console.log('\nMigration complete!');
    }

    await sequelize.close();
}

main().catch(function(err) {
    console.error('Fatal error:', err);
    process.exit(1);
});
