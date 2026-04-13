require('dotenv').config();
const { sequelize } = require('./config/database');
const User = require('./models/User');
const UserAddon = require('./models/UserAddon');
const Addon = require('./models/Addon');

async function debug() {
    try {
        await sequelize.authenticate();
        console.log('DB Connected.');

        const users = await User.findAll({ attributes: ['id', 'email', 'name', 'aiTokenBalance'] });
        console.log('\n--- USERS ---');
        console.table(users.map(u => u.toJSON()));

        const addons = await Addon.findAll();
        console.log('\n--- ADDONS ---');
        console.table(addons.map(a => a.toJSON()));

        const userAddons = await UserAddon.findAll();
        console.log('\n--- USER ADDONS ---');
        console.table(userAddons.map(ua => ua.toJSON()));

    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
debug();
