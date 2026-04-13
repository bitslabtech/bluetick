require('dotenv').config();
const { sequelize } = require('./config/database');
const User = require('./models/User');
const { getMonthlyMessageCount } = require('./utils/planLimits');

async function testCounts() {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');

        // Let's find an active user
        const user = await User.findOne({ order: [['createdAt', 'DESC']] });

        if (!user) {
            console.log("No user found.");
            return;
        }

        console.log(`Testing limits for user: ${user.email} (ID: ${user.id})`);

        const monthlyCount = await getMonthlyMessageCount(user.id);
        
        console.log(`\nResults:`);
        console.log(`Monthly Outbound Message Count (Includes Bot+Manual+Campaign): ${monthlyCount}`);
        
    } catch (e) {
        console.error(e);
    } finally {
        await sequelize.close();
    }
}

testCounts();
