require('dotenv').config();
const { sequelize } = require('./config/database');
const ContactFlowState = require('./models/ContactFlowState');
const fs = require('fs');

async function main() {
    try {
        await sequelize.authenticate();
        const states = await ContactFlowState.findAll({ raw: true });
        fs.writeFileSync('states_summary.json', JSON.stringify(states, null, 2));
    } catch(e) {
        console.error(e);
    }
    process.exit(0);
}

main();
