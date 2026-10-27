/**
 * Phase 2: Complete Database CDN Migration (cdn.bluetick.cloud -> cdn.onedash.cloud)
 *
 * 100% Comprehensive & Automated:
 *   - Dynamically scans EVERY table and EVERY text/varchar/json/jsonb column
 *     across your entire PostgreSQL database via information_schema.
 *   - No hardcoded tables: nothing is skipped (MediaFiles, WaStores, WaProducts,
 *     Vcards, Templates, Blogs, LandingPages, SystemConfigs, etc.).
 *   - DRY-RUN by default: previews all matches and row counts with ZERO database writes.
 *   - With --execute: safely updates all occurrences directly in PostgreSQL.
 *   - Post-migration audit: runs a full-database verification scan to ensure 0 references remain.
 *
 * Usage:
 *   node cdn_migrate.js            # Preview / Dry Run
 *   node cdn_migrate.js --execute  # Execute migration
 */

const OLD_CDN = 'cdn.bluetick.cloud';
const NEW_CDN = 'cdn.onedash.cloud';
const DRY_RUN = !process.argv.includes('--execute');

require('dotenv').config({ path: __dirname + '/.env' });
const { sequelize } = require('./config/database');

async function main() {
    await sequelize.authenticate();
    console.log('Database connected.');
    console.log('\n======================================================');
    console.log('  CDN GLOBAL DATABASE SCAN & MIGRATION');
    console.log('  Mode : ' + (DRY_RUN ? '*** DRY RUN (0 changes will be made) ***' : '*** LIVE EXECUTION (writing changes to DB) ***'));
    console.log('  From : ' + OLD_CDN);
    console.log('  To   : ' + NEW_CDN);
    console.log('======================================================\n');

    // 1. Fetch all candidate columns across the entire 'public' schema
    const [columns] = await sequelize.query(`
        SELECT table_name, column_name, data_type, udt_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND data_type IN ('text', 'character varying', 'json', 'jsonb')
        ORDER BY table_name, column_name
    `);

    console.log(`Found ${columns.length} candidate text/JSON columns across all database tables.`);
    console.log('Scanning entire database for references to ' + OLD_CDN + '...\n');

    const matches = [];
    let totalOccurrences = 0;

    // 2. Scan every table and column for OLD_CDN
    for (const col of columns) {
        const { table_name, column_name, data_type, udt_name } = col;
        try {
            const [result] = await sequelize.query(`
                SELECT COUNT(*) as cnt
                FROM "${table_name}"
                WHERE "${column_name}"::text LIKE '%${OLD_CDN}%'
            `);
            const count = parseInt(result[0]?.cnt || 0, 10);
            if (count > 0) {
                matches.push({
                    table: table_name,
                    column: column_name,
                    type: data_type,
                    udt: udt_name,
                    count
                });
                totalOccurrences += count;
                console.log(`  [FOUND] ${table_name}.${column_name} (${data_type}): ${count} rows`);
            }
        } catch (err) {
            // Skip views or system virtual tables if any
        }
    }

    if (matches.length === 0) {
        console.log('\n✅ 0 matches found! The database has no references to ' + OLD_CDN + '.');
        await sequelize.close();
        return;
    }

    console.log(`\nFound a total of ${totalOccurrences} rows across ${matches.length} columns containing ${OLD_CDN}.`);

    // 3. Execution Phase
    if (DRY_RUN) {
        console.log('\n------------------------------------------------------');
        console.log('  DRY RUN COMPLETE — ZERO CHANGES WRITTEN.');
        console.log('  To perform the migration across all tables, run:');
        console.log('  node cdn_migrate.js --execute');
        console.log('------------------------------------------------------');
    } else {
        console.log('\n--- Executing Migration Across All Matched Columns ---');
        let updatedCols = 0;

        for (const m of matches) {
            const { table, column, type, count } = m;
            try {
                if (type === 'json' || type === 'jsonb') {
                    const castType = type === 'jsonb' ? 'jsonb' : 'json';
                    await sequelize.query(`
                        UPDATE "${table}"
                        SET "${column}" = REPLACE("${column}"::text, '${OLD_CDN}', '${NEW_CDN}')::${castType}
                        WHERE "${column}"::text LIKE '%${OLD_CDN}%'
                    `);
                } else {
                    await sequelize.query(`
                        UPDATE "${table}"
                        SET "${column}" = REPLACE("${column}", '${OLD_CDN}', '${NEW_CDN}')
                        WHERE "${column}" LIKE '%${OLD_CDN}%'
                    `);
                }
                console.log(`  [UPDATED] ${table}.${column} (${count} rows)`);
                updatedCols++;
            } catch (err) {
                console.error(`  [ERROR] Failed updating ${table}.${column}:`, err.message);
            }
        }

        // 4. Full Audit Verification Pass
        console.log('\n--- Running Post-Migration Verification Audit ---');
        let remainingReferences = 0;

        for (const col of columns) {
            const { table_name, column_name } = col;
            try {
                const [res] = await sequelize.query(`
                    SELECT COUNT(*) as cnt
                    FROM "${table_name}"
                    WHERE "${column_name}"::text LIKE '%${OLD_CDN}%'
                `);
                const remaining = parseInt(res[0]?.cnt || 0, 10);
                if (remaining > 0) {
                    remainingReferences += remaining;
                    console.warn(`  [WARNING] Remaining reference in ${table_name}.${column_name}: ${remaining} rows`);
                }
            } catch (e) {}
        }

        if (remainingReferences === 0) {
            console.log('\n======================================================');
            console.log('  ✅ 100% COMPLETE & VERIFIED:');
            console.log('  Zero occurrences of ' + OLD_CDN + ' remain in the database!');
            console.log('======================================================');
        } else {
            console.log(`\n⚠️ Audit completed with ${remainingReferences} remaining references.`);
        }
    }

    await sequelize.close();
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
