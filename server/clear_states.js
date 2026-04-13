require('dotenv').config();
const { sequelize } = require('./config/database');
const ContactFlowState = require('./models/ContactFlowState');
const fs = require('fs');

async function main() {
    try {
        await sequelize.authenticate();
        await ContactFlowState.destroy({ where: {} }); // Clear all test states
        console.log("All stuck flow states cleared successfully.");
    } catch(e) {
        console.error(e);
    }
    process.exit(0);
}

main();
