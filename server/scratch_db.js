const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');
dotenv.config();

const DB_NAME = process.env.DB_NAME || 'whatsapp_saas';
const DB_USER = process.env.DB_USER || 'postgres';
const DB_PASS = process.env.DB_PASS || 'password';
const DB_HOST = process.env.DB_HOST || 'localhost';

const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASS, {
    host: DB_HOST,
    dialect: 'postgres',
    logging: false
});

async function run() {
    try {
        await sequelize.authenticate();
        console.log('Connected.');
        
        // Let's first check what enum types exist
        const [results] = await sequelize.query(`
            SELECT t.typname, e.enumlabel
            FROM pg_type t
            JOIN pg_enum e ON t.oid = e.enumtypid
            WHERE t.typname LIKE '%AdminNotification%';
        `);
        console.log(results);
    } catch (e) {
        console.error(e);
    } finally {
        await sequelize.close();
    }
}

run();
