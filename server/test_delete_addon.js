require('dotenv').config();
const UserAddon = require('./models/UserAddon');
const Addon = require('./models/Addon');

async function testDelete() {
    try {
        console.log('DB connected.');

        // Find any addon
        const addon = await Addon.findOne();
        if (!addon) {
            console.log('No addons found in DB.');
            process.exit(0);
        }

        console.log(`Found Addon: ${addon.name} (${addon.id})`);

        console.log('Attempting to delete related UserAddons...');
        const deletedUserAddons = await UserAddon.destroy({ where: { addonId: addon.id } });
        console.log(`Deleted ${deletedUserAddons} UserAddons.`);

        // Now try destroying Addon
        console.log('Attempting to delete Addon...');
        await addon.destroy();
        console.log('Addon deleted perfectly!');

    } catch (e) {
        console.error('Delete Failed! Error details:');
        console.error(e);
    } finally {
        process.exit();
    }
}
testDelete();
