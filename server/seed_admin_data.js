require('dotenv').config();
const { sequelize } = require('./config/database');
const User = require('./models/User');
const Transaction = require('./models/Transaction');
const ActivityLog = require('./models/ActivityLog');

const plans = ['Free', 'Basic', 'Pro', 'Enterprise'];
const planPrices = { 'Free': 0, 'Basic': 29, 'Pro': 99, 'Enterprise': 299 };

function getRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

async function seedAdminData() {
    try {
        await sequelize.authenticate();
        await sequelize.sync({ alter: true }); // Ensure tables exist
        console.log('✅ Connected & Synced.');

        // 1. Update Existing Users with Random Plans
        const users = await User.findAll();
        for (const user of users) {
            // Skip admins usually, but for demo let's give everyone plans
            if (!user.isAdmin) {
                const plan = getRandom(plans);
                user.plan = plan;
                user.planStatus = 'Active';
                // Set expiry 30 days from now
                const expiry = new Date();
                expiry.setDate(expiry.getDate() + 30);
                user.planExpiry = expiry;

                user.company = getRandom(companies);
                user.lastLogin = new Date(Date.now() - Math.floor(Math.random() * 1000000000));

                await user.save();
            }
        }
        console.log(`Updated ${users.length} users with plans.`);

        // 2. Create Transactions (Historical Revenue)
        // Create 50 fake transactions over last 30 days
        const transactions = [];
        const now = new Date();

        for (let i = 0; i < 50; i++) {
            const randomUser = getRandom(users);
            // 50% chance of being recent (last 5 days) for "Recent Purchases" list
            const daysAgo = Math.random() > 0.5 ? Math.floor(Math.random() * 5) : Math.floor(Math.random() * 30);
            const date = new Date(now);
            date.setDate(date.getDate() - daysAgo);

            const plan = getRandom(['Basic', 'Pro', 'Enterprise']); // Only paid plans

            transactions.push({
                userId: randomUser.id,
                amount: planPrices[plan],
                currency: 'USD',
                // Let's use INR (RS) as requested
                planName: plan,
                status: 'COMPLETED',
                createdAt: date,
                updatedAt: date
            });
        }
        // Fix Amount for INR
        transactions.forEach(t => {
            if (t.planName === 'Basic') t.amount = 2499;
            if (t.planName === 'Pro') t.amount = 7499;
            if (t.planName === 'Enterprise') t.amount = 19999;
            t.currency = 'INR';
        });

        await Transaction.bulkCreate(transactions);
        console.log(`Created ${transactions.length} mock transactions.`);

        // 3. Create Activity Logs
        const logs = [];
        const actions = ['LOGIN', 'CAMPAIGN_CREATED', 'TEMPLATE_SUBMITTED', 'CONTACTS_IMPORTED', 'PLAN_UPGRADED'];

        for (let i = 0; i < 20; i++) {
            const randomUser = getRandom(users);
            const action = getRandom(actions);
            const daysAgo = Math.floor(Math.random() * 7);
            const date = new Date(now);
            date.setDate(date.getDate() - daysAgo);

            logs.push({
                userId: randomUser.id,
                action: action,
                details: `User performed ${action.toLowerCase()}`,
                ip: `192.168.1.${Math.floor(Math.random() * 255)}`,
                createdAt: date
            });
        }

        await ActivityLog.bulkCreate(logs);
        console.log(`Created ${logs.length} activity logs.`);

        console.log('🎉 Seed Complete!');

    } catch (err) {
        console.error('Seed Error:', err);
    } finally {
        await sequelize.close();
    }
}

seedAdminData();
