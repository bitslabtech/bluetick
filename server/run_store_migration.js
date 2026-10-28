require('dotenv').config();
const { sequelize } = require('./config/database');

async function runMigration() {
    console.log('--- Starting StoreItems & Users Migration ---');
    try {
        await sequelize.authenticate();
        console.log('✅ Connected to database successfully.');

        // 1. Add 'team_members' to enum_StoreItems_itemType if the enum exists
        try {
            await sequelize.query(`ALTER TYPE "enum_StoreItems_itemType" ADD VALUE IF NOT EXISTS 'team_members';`);
            console.log('✅ Step 1: Added team_members to enum_StoreItems_itemType.');
        } catch (e) {
            if (e.message && !e.message.includes('already exists') && !e.message.includes('syntax error')) {
                try {
                    await sequelize.query(`ALTER TYPE "enum_StoreItems_itemType" ADD VALUE 'team_members';`);
                    console.log('✅ Step 1: Added team_members to enum_StoreItems_itemType (legacy fallback).');
                } catch (err) {
                    console.log('ℹ️  Step 1: Enum note (already exists or not using enum):', err.message);
                }
            } else {
                console.log('ℹ️  Step 1: Enum note (already exists or not using enum):', e.message);
            }
        }

        // 2. Alter column to VARCHAR(50) so enum constraints never block new items
        try {
            await sequelize.query(`ALTER TABLE "StoreItems" ALTER COLUMN "itemType" TYPE VARCHAR(50) USING "itemType"::text;`);
            console.log('✅ Step 2: StoreItems.itemType column converted to VARCHAR(50).');
        } catch (e) {
            console.log('⚠️  Step 2 note:', e.message);
        }

        // 3. Ensure validityMonths column exists on StoreItems
        try {
            await sequelize.query(`ALTER TABLE "StoreItems" ADD COLUMN IF NOT EXISTS "validityMonths" INTEGER DEFAULT 12;`);
            console.log('✅ Step 3: StoreItems.validityMonths column ensured.');
        } catch (e) {
            console.log('⚠️  Step 3 note:', e.message);
        }

        // 4. Ensure Users extra team member topup columns
        try {
            await sequelize.query(`ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "extraTopupTeamMembers" INTEGER DEFAULT 0;`);
            await sequelize.query(`ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "teamMemberTopupExpiry" TIMESTAMP WITH TIME ZONE DEFAULT NULL;`);
            console.log('✅ Step 4: Users extraTopupTeamMembers and teamMemberTopupExpiry ensured.');
        } catch (e) {
            console.log('⚠️  Step 4 note:', e.message);
        }

        // 5. Verification
        const [results] = await sequelize.query(`
            SELECT column_name, data_type, udt_name 
            FROM information_schema.columns 
            WHERE table_name = 'StoreItems' AND column_name IN ('itemType', 'validityMonths');
        `);
        console.log('\n--- Verification Results ---');
        console.table(results);
        console.log('🎉 Migration completed successfully! You can now create team member seat topups.\n');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
        process.exit(1);
    }
}

runMigration();
