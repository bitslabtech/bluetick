require('dotenv').config();
const Addon = require('./models/Addon');

async function testFetch() {
    try {
        const addons = await Addon.findAll();
        console.log(`There are exactly ${addons.length} Add-ons in the database right now.`);
        addons.forEach(a => console.log('Found:', a.name, a.id));
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
testFetch();
