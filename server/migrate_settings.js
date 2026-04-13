// One-time migration: adds missing columns to Settings table
require('dotenv').config();
const { sequelize } = require('./config/database');

async function run() {
    const cols = [
        `ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "appName" VARCHAR(255) DEFAULT 'App'`,
        `ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "supportEmail" VARCHAR(255) DEFAULT ''`,
        `ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "currency" VARCHAR(50) DEFAULT 'USD'`,
        `ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "timezone" VARCHAR(100) DEFAULT 'UTC'`,
        `ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "primaryColor" VARCHAR(50) DEFAULT '#4f46e5'`,
        `ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "secondaryColor" VARCHAR(50) DEFAULT '#ec4899'`,
        `ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "logoUrl" TEXT DEFAULT ''`,
        `ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "language" VARCHAR(20) DEFAULT 'en'`,
        `ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "dateFormat" VARCHAR(50) DEFAULT 'DD/MM/YYYY'`,
        `ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "notificationTemplates" JSONB DEFAULT '{}'`,
        `ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "paymentGateways" JSONB DEFAULT '{}'`,
        `ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "smtpConfig" JSONB DEFAULT '{}'`,
        `ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "securityConfig" JSONB DEFAULT '{}'`,
        `ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "whatsappProfile" JSONB DEFAULT '{}'`,
        `ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "whatsappAutomations" JSONB DEFAULT '{}'`,
        `ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "teamPolicy" JSONB DEFAULT '{}'`,
    ];

    for (const sql of cols) {
        try {
            await sequelize.query(sql);
            console.log('✓', sql.substring(0, 60));
        } catch (e) {
            console.error('✗', e.message);
        }
    }
    console.log('Migration complete.');
    process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
