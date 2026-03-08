require('dotenv').config({ path: __dirname + '/../.env' });
const { sequelize } = require('../config/database');
const MessageLog = require('../models/MessageLog');
const fs = require('fs');

const dumpLogs = async () => {
    try {
        await sequelize.authenticate();

        const logs = await MessageLog.findAll({
            limit: 5,
            order: [['createdAt', 'DESC']]
        });

        const data = logs.map(l => ({
            id: l.id,
            status: l.status,
            messageId: l.messageId,
            campaignId: l.campaignId,
            createdAt: l.createdAt
        }));

        fs.writeFileSync('logs_dump.json', JSON.stringify(data, null, 2));
        console.log("Dumped to logs_dump.json");

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await sequelize.close();
    }
};

dumpLogs();
