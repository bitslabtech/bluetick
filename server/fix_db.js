require('dotenv').config();
const { sequelize } = require('./config/database');

async function fixDb() {
    try {
        await sequelize.authenticate();
        await sequelize.query(`UPDATE "ActivityLogs" SET "userId" = NULL WHERE "userId" NOT IN (SELECT id FROM "Users")`);
        console.log('Fixed ActivityLogs');
    } catch (e) {
        console.error(e);
    } finally {
        await sequelize.close();
    }
}
fixDb();
