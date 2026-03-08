require('dotenv').config({ path: __dirname + '/../.env' });
const { sequelize } = require('../config/database');
const fs = require('fs');

const log = (msg) => {
    console.log(msg);
    fs.appendFileSync('fix_conversation_log.txt', msg + '\n');
};

const runFix = async () => {
    fs.writeFileSync('fix_conversation_log.txt', 'Starting Fix for Conversations...\n');
    try {
        await sequelize.authenticate();
        log("Connected.");

        // 1. Find Unique Constraints (Robust lookup)
        const [constraints] = await sequelize.query(`
            SELECT conname 
            FROM pg_constraint c
            JOIN pg_class t ON c.conrelid = t.oid
            WHERE t.relname = 'Conversations'
            AND c.contype = 'u';
        `);

        // 2. Find Indexes (Unique) on 'phoneNumber'
        const [indexes] = await sequelize.query(`
            SELECT indexname 
            FROM pg_indexes 
            WHERE tablename = 'Conversations' 
            AND indexdef LIKE '%UNIQUE%';
        `);

        log("Found " + constraints.length + " constraints.");

        // 3. Drop Constraints
        for (const c of constraints) {
            const name = c.conname;
            // Skip primary key
            if (name.includes('pkey')) continue;

            log(`Dropping Constraint: ${name}`);
            try {
                await sequelize.query(`ALTER TABLE "Conversations" DROP CONSTRAINT IF EXISTS "${name}" CASCADE;`);
                log(`✓ Dropped constraint ${name}`);
            } catch (e) {
                log(`x Failed to drop constraint ${name}: ${e.message}`);
            }
        }

        // 4. Drop Indexes specifically on phoneNumber
        for (const idx of indexes) {
            // targeted check - match phoneNumber case insensitive
            if (idx.indexname.toLowerCase().includes('phonenumber') || idx.indexname.includes('key')) {
                // Be careful not to drop primary key 'Conversations_pkey'
                if (idx.indexname.includes('pkey')) continue;

                const name = idx.indexname;
                log(`Dropping Index: ${name}`);
                try {
                    await sequelize.query(`DROP INDEX IF EXISTS "${name}" CASCADE;`);
                    log(`✓ Dropped ${name}`);
                } catch (e) {
                    log(`x Failed to drop index ${name}: ${e.message}`);
                }
            }
        }

        log("Done.");

    } catch (error) {
        log("Error: " + error.message);
    } finally {
        await sequelize.close();
    }
};

runFix();
