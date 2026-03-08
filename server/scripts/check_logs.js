require('dotenv').config({ path: __dirname + '/../.env' });
const { sequelize } = require('../config/database');
const MessageLog = require('../models/MessageLog');

const checkLogs = async () => {
    try {
        await sequelize.authenticate();

        const logs = await MessageLog.findAll({
            limit: 5,
            order: [['createdAt', 'DESC']]
        });

        console.log(JSON.stringify(logs.map(l => ({
            id: l.id,
            status: l.status,
            messageId: l.messageId, // CRITICAL
            createdAt: l.createdAt
        })), null, 2));

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await sequelize.close();
    }
};

checkLogs();
