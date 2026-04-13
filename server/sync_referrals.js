/**
 * Run this script ONCE to add the referral columns to the Users table
 * and create the ReferralRewards table.
 * 
 * Usage: node sync_referrals.js
 */

require('dotenv').config(); // Load .env first so DB credentials work

const { sequelize } = require('./config/database');
const User = require('./models/User');
const ReferralReward = require('./models/ReferralReward');
const crypto = require('crypto');

const syncDB = async () => {
    try {
        console.log('[SYNC] Connecting to database...');
        await sequelize.authenticate();
        console.log('[SYNC] Connected.');

        // 1. Alter Users table to add referralCode + referredBy columns
        console.log('[SYNC] Syncing Users table (alter)...');
        await User.sync({ alter: true });
        console.log('[SYNC] Users table synced.');

        // 2. Create the ReferralRewards table if it doesn't exist
        console.log('[SYNC] Syncing ReferralReward table...');
        await ReferralReward.sync({ alter: true });
        console.log('[SYNC] ReferralReward table synced.');

        // 3. Backfill referralCode for all users that don't have one yet
        console.log('[SYNC] Backfilling referral codes for existing users...');
        const users = await User.findAll({ where: { referralCode: null } });
        console.log(`[SYNC] Found ${users.length} users without a referral code.`);
        
        for (const u of users) {
            u.referralCode = crypto.randomBytes(4).toString('hex').toUpperCase();
            await u.save();
        }

        console.log('[SYNC] All done! Referral system database is ready.');
        process.exit(0);
    } catch (err) {
        console.error('[SYNC ERROR]', err);
        process.exit(1);
    }
};

syncDB();
