require('dotenv').config({ path: __dirname + '/../.env' });
const { sequelize } = require('../config/database');
const fs = require('fs');

const log = (msg) => {
    console.log(msg);
    fs.appendFileSync('fix_log.txt', msg + '\n');
};

const runFix = async () => {
    fs.writeFileSync('fix_log.txt', 'Starting Fix...\n');
    try {
        await sequelize.authenticate();
        log("Connected.");

        // 1. Inspect current state via SQL
        const [indexes] = await sequelize.query(`
            SELECT indexname 
            FROM pg_indexes 
            WHERE tablename = 'Contacts' 
        `); // Get ALL indexes on Contacts

        log("Found Indexes: " + JSON.stringify(indexes.map(i => i.indexname)));

        // 2. Identify Target Indexes (Unique + Phone)
        // We will just drop ANYTHING that looks like a phone unique index
        const targets = indexes
            .map(i => i.indexname)
            .filter(name => name.includes('phone') && (name.includes('key') || name.includes('unique') || name === 'contacts_phone'));

        // Add explicit suspicion
        if (!targets.includes('Contacts_phone_key241')) targets.push('Contacts_phone_key241');

        log("Targeting for Drop: " + JSON.stringify(targets));

        // 3. Drop Them
        for (const idx of targets) {
            log(`Dropping Index: ${idx}`);
            try {
                await sequelize.query(`DROP INDEX IF EXISTS "${idx}" CASCADE;`);
                log(`✓ Dropped ${idx}`);
            } catch (e) {
                log(`x Failed to drop ${idx}: ${e.message}`);
                // Try constraint drop too just in case it shares name
                try {
                    await sequelize.query(`ALTER TABLE "Contacts" DROP CONSTRAINT IF EXISTS "${idx}" CASCADE;`);
                    log(`✓ Dropped constraint ${idx}`);
                } catch (e2) {
                    log(`x Failed to drop constraint ${idx}: ${e2.message}`);
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
