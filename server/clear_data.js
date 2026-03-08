require('dotenv').config();
const { sequelize } = require('./config/database');
const Transaction = require('./models/Transaction');
const ActivityLog = require('./models/ActivityLog');
const MessageLog = require('./models/MessageLog');
const SystemNotification = require('./models/SystemNotification');

const clearData = async () => {
    try {
        await sequelize.authenticate();
        console.log('Connected to DB...');

        // Truncate tables (Cascading if necessary, but usually logs are leaf nodes)
        await Transaction.destroy({ where: {}, truncate: true, cascade: true });
        console.log('Cleared Transactions');

        await ActivityLog.destroy({ where: {}, truncate: true, cascade: true });
        console.log('Cleared Activity Logs');

        await MessageLog.destroy({ where: {}, truncate: true, cascade: true });
        console.log('Cleared Message Logs');

        await SystemNotification.destroy({ where: {}, truncate: true, cascade: true });
        console.log('Cleared System Notifications');

        console.log('All mock data cleared successfully.');
        process.exit();
    } catch (err) {
        console.error('Error clearing data:', err);
        process.exit(1);
    }
};

clearData();
