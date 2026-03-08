const { sequelize } = require('./server/config/database');
const MessageLog = require('./server/models/MessageLog');

(async () => {
    try {
        await sequelize.authenticate();
        console.log('Connection has been established successfully.');

        // Fetch one record with raw: true
        const logs = await MessageLog.findAll({
            limit: 1,
            raw: true
        });

        if (logs.length > 0) {
            console.log("Raw Log Keys:", Object.keys(logs[0]));
            console.log("Sample Log:", logs[0]);
        } else {
            console.log("No logs found.");
        }

        process.exit(0);
    } catch (error) {
        console.error('Unable to connect to the database:', error);
        process.exit(1);
    }
})();
