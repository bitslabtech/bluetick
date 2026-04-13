const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASS, {
    host: process.env.DB_HOST,
    dialect: 'postgres'
});

async function fix() {
    try {
        await sequelize.query(`UPDATE "Settings" SET "logoUrl" = NULL`);
        console.log('Cleared all logoUrls');
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
fix();
