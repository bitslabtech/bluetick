require('dotenv').config();
const { sequelize } = require('./config/database');
const User = require('./models/User');

const email = process.argv[2];

if (!email) {
    console.error('\n❌ Please provide an email address.');
    console.error('Usage: node make_admin.js <user_email>\n');
    process.exit(1);
}

async function promoteUser() {
    try {
        await sequelize.authenticate();
        console.log('✅ Connected to database.');

        const user = await User.findOne({ where: { email } });

        if (!user) {
            console.error(`\n❌ User with email "${email}" not found.`);
            console.error('Please verify the email address and try again.\n');
            process.exit(1);
        }

        if (user.isAdmin) {
            console.log(`\nℹ️  User "${email}" is already an Admin.\n`);
            process.exit(0);
        }

        user.isAdmin = true;
        await user.save();

        console.log(`\n🎉 Success! User "${email}" has been promoted to Superadmin.`);
        console.log('👉 Please Log Out and Log In again to see the changes.\n');

    } catch (error) {
        console.error('\n❌ Error updating user:', error);
    } finally {
        await sequelize.close();
    }
}

promoteUser();
