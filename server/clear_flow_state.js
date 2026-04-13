require('dotenv').config();
const ContactFlowState = require('./models/ContactFlowState');
const { sequelize } = require('./config/database');

async function clearStates() {
    try {
        // We use truncate: true to quickly clear the table
        await ContactFlowState.destroy({ where: {}, truncate: true, cascade: true });
        console.log('Successfully cleared all ContactFlowStates.');
        process.exit(0);
    } catch (err) {
        console.error('Error clearing states:', err);
        process.exit(1);
    }
}

clearStates();
