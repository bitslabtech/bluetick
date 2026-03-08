require('dotenv').config({ path: __dirname + '/../.env' });
const { sequelize } = require('../config/database');
const MessageLog = require('../models/MessageLog');

// USAGE: node simulate_webhook.js [STATUS] [COUNT]
// Example: node simulate_webhook.js READ 5 (Updates last 5 messages to READ)
// Default: DELIVERED 1

const simulate = async () => {
    const statusArg = process.argv[2] ? process.argv[2].toUpperCase() : 'DELIVERED';
    const countArg = process.argv[3] ? parseInt(process.argv[3]) : 1;

    console.log(`\n--- WhatsApp Webhook Simulator (Localhost) ---`);
    console.log(`Action: Updating last ${countArg} message(s) to '${statusArg}'\n`);

    try {
        await sequelize.authenticate();

        // Find most recent pending/sent messages
        const logs = await MessageLog.findAll({
            limit: countArg,
            order: [['createdAt', 'DESC']],
            where: {
                status: ['PENDING', 'SENT', 'DELIVERED'] // Don't update failed ones usually
            }
        });

        if (logs.length === 0) {
            console.log("No recent active messages found to update.");
            return;
        }

        for (const log of logs) {
            console.log(`[${log.id}] ${log.phone}: ${log.status} -> ${statusArg}`);
            log.status = statusArg;
            log.metaTimestamp = Math.floor(Date.now() / 1000).toString();
            await log.save();
        }

        console.log(`\n✅ Successfully simulated webhook for ${logs.length} messages.`);
        console.log(`Check your UI now!`);

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await sequelize.close();
    }
};

simulate();
