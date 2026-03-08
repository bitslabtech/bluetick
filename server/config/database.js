const { Sequelize } = require('sequelize');
const { Client } = require('pg');

const DB_NAME = process.env.DB_NAME || 'whatsapp_saas';
const DB_USER = process.env.DB_USER || 'postgres';
const DB_PASS = process.env.DB_PASS || 'password';
const DB_HOST = process.env.DB_HOST || 'localhost';

async function createDbIfNotExists() {
    const client = new Client({
        user: DB_USER,
        password: DB_PASS,
        host: DB_HOST,
        database: 'postgres' // Connect to default DB to create new one
    });

    try {
        await client.connect();
        const res = await client.query(`SELECT 1 FROM pg_database WHERE datname = '${DB_NAME}'`);
        if (res.rowCount === 0) {
            console.log(`Database ${DB_NAME} not found. Creating...`);
            await client.query(`CREATE DATABASE "${DB_NAME}"`);
            console.log(`Database ${DB_NAME} created successfully.`);
        } else {
            console.log(`Database ${DB_NAME} already exists.`);
        }
    } catch (err) {
        console.error('Error checking/creating database:', err);
    } finally {
        await client.end();
    }
}

const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASS, {
    host: DB_HOST,
    dialect: 'postgres',
    logging: false
});

module.exports = { sequelize, createDbIfNotExists };
