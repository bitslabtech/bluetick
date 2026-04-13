require('dotenv').config();
const { sequelize } = require('./config/database');
const User = require('./models/User');
const MessageLog = require('./models/MessageLog');
const Transaction = require('./models/Transaction');
const ActivityLog = require('./models/ActivityLog');

async function testStats() {
    console.log("Testing DB Query Speeds...");
    const start = Date.now();

    const t1 = Date.now();
    await User.count();
    console.log("Users Count:", Date.now() - t1, "ms");

    const t2 = Date.now();
    await Transaction.aggregate('amount', 'sum', { where: { status: 'COMPLETED' } });
    console.log("Revenue Agg:", Date.now() - t2, "ms");

    const t3 = Date.now();
    await MessageLog.count();
    console.log("Messages Count:", Date.now() - t3, "ms");

    const t4 = Date.now();
    await ActivityLog.findAll({ limit: 10, include: [User] });
    console.log("Activity Logs:", Date.now() - t4, "ms");

    const t5 = Date.now();
    await User.findAll({
        attributes: ['plan', [sequelize.fn('count', sequelize.col('id')), 'count']],
        group: ['plan'],
        raw: true
    });
    console.log("Plan Dist:", Date.now() - t5, "ms");

    console.log("Total DB Time:", Date.now() - start, "ms");
    process.exit(0);
}

sequelize.authenticate().then(testStats).catch(console.error);
