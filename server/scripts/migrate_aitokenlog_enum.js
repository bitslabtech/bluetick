/**
 * One-time migration: adds new feature values to the PostgreSQL enum
 * used by the AiTokenLogs table.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { sequelize } = require('../config/database');

const newValues = ['ai_template_enhancer', 'ai_chat_drafter', 'ai_chat_enhancer', 'ai_template_draft'];
const enumName = 'enum_AiTokenLogs_feature';

(async () => {
    for (const val of newValues) {
        try {
            await sequelize.query(`ALTER TYPE "${enumName}" ADD VALUE IF NOT EXISTS '${val}'`);
            console.log(`✅ Added enum value: ${val}`);
        } catch (err) {
            // IF NOT EXISTS is Postgres 9.3+; safe to swallow "already exists"
            if (err.message?.includes('already exists')) {
                console.log(`⚠️  Already exists: ${val}`);
            } else {
                console.error(`❌ Failed to add ${val}:`, err.message);
            }
        }
    }
    console.log('Migration complete.');
    process.exit(0);
})();
