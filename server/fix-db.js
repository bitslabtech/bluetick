const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASS, {
    host: process.env.DB_HOST,
    dialect: 'postgres',
    port: process.env.DB_PORT || 5432,
    logging: console.log
});

async function fix() {
    try {
        await sequelize.authenticate();
        console.log('Connected to DB');
        // If there are empty strings or invalid UUIDs, we should set them to null first or drop them
        // The safest way is to just drop the column and let sync recreate it to avoid data parsing errors
        await sequelize.query('ALTER TABLE "Conversations" DROP COLUMN "assignedTo";');
        console.log('Column dropped successfully. Restart nodeserver to allow sync to recreate it as UUID.');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

fix();
