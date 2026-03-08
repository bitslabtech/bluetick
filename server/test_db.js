require('dotenv').config();
const { sequelize } = require('./config/database');
const User = require('./models/User');
const Plan = require('./models/Plan');

async function test() {
    await sequelize.authenticate();
    const users = await User.findAll({ attributes: ['id', 'email', 'plan', 'planStatus', 'planExpiry'] });
    console.log("Users:", JSON.stringify(users.map(u => u.toJSON()), null, 2));
    const plans = await Plan.findAll({ attributes: ['name', 'price', 'interval'] });
    console.log("Plans:", JSON.stringify(plans.map(p => p.toJSON()), null, 2));
}
test().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
