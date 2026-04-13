require('dotenv').config();
const { sequelize } = require('./config/database');
const User = require('./models/User');
const AiTokenLog = require('./models/AiTokenLog');

async function testGroup() {
    try {
        console.log("Testing Top Token Users query...");
        const result = await AiTokenLog.findAll({
            attributes: [
                'userId',
                [sequelize.fn('sum', sequelize.col('tokensUsed')), 'totalTokens']
            ],
            include: [{ model: User, attributes: ['name', 'email'] }],
            group: ['userId', 'User.id'],
            order: [[sequelize.literal('"totalTokens"'), 'DESC']],
            limit: 5,
            raw: true,
            nest: true
        });
        console.log(result);
    } catch(err) {
        console.error(err);
    }
    process.exit(0);
}
sequelize.authenticate().then(testGroup);
