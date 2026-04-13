require('dotenv').config({ path: './server/.env' });
const { sequelize } = require('./server/config/database');
const Flow = require('./server/models/Flow');

async function main() {
    try {
        await sequelize.authenticate();
        const flows = await Flow.findAll({ raw: true });
        console.log(JSON.stringify(flows, null, 2));
    } catch(e) {
        console.error(e);
    }
    process.exit(0);
}

main();
