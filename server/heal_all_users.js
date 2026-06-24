/**
 * heal_all_users.js
 * ------------------
 * One-shot repair: syncs User.fbAccessToken / metaPhoneNumberId / wabaId 
 * into Settings for every user where Settings is missing/empty.
 *
 * Run with: node heal_all_users.js
 */
require('dotenv').config();
const { sequelize } = require('./config/database');

async function healAll() {
    const User     = require('./models/User');
    const Settings = require('./models/Settings');

    const users = await User.findAll({
        where: sequelize.literal(`("fbAccessToken" IS NOT NULL AND "fbAccessToken" != '')`),
        attributes: ['id', 'email', 'fbAccessToken', 'metaPhoneNumberId', 'wabaId']
    });

    console.log(`\nFound ${users.length} user(s) with fbAccessToken set.\n`);

    let healed = 0, alreadyOk = 0;

    for (const user of users) {
        let settings = await Settings.findOne({ where: { userId: user.id } });
        if (!settings) {
            settings = await Settings.create({ userId: user.id });
        }

        const needsHeal =
            !settings.metaAccessToken || settings.metaAccessToken === '' ||
            !settings.metaPhoneNumberId || settings.metaPhoneNumberId === '' ||
            !settings.metaBusinessAccountId || settings.metaBusinessAccountId === '';

        if (!needsHeal) {
            console.log(`  ✅ ${user.email}: already configured, skipping.`);
            alreadyOk++;
            continue;
        }

        const changes = [];
        if (user.fbAccessToken && (!settings.metaAccessToken || settings.metaAccessToken === '')) {
            settings.metaAccessToken = user.fbAccessToken;
            changes.push(`metaAccessToken (len:${user.fbAccessToken.length})`);
        }
        if (user.metaPhoneNumberId && (!settings.metaPhoneNumberId || settings.metaPhoneNumberId === '')) {
            settings.metaPhoneNumberId = user.metaPhoneNumberId;
            changes.push(`metaPhoneNumberId:${user.metaPhoneNumberId}`);
        }
        if (user.wabaId && (!settings.metaBusinessAccountId || settings.metaBusinessAccountId === '')) {
            settings.metaBusinessAccountId = user.wabaId;
            changes.push(`wabaId:${user.wabaId}`);
        }

        if (changes.length > 0) {
            await settings.save();
            console.log(`  🔧 ${user.email}: healed → ${changes.join(', ')}`);
            healed++;
        } else {
            console.log(`  ℹ️  ${user.email}: User model also missing values — user must reconnect via Embedded Signup.`);
        }
    }

    console.log(`\nDone. Healed: ${healed}, Already OK: ${alreadyOk}\n`);
    process.exit(0);
}

healAll().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
});
