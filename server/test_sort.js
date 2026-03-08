require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');

const DB_NAME = process.env.DB_NAME || 'whatsapp_saas';
const DB_USER = process.env.DB_USER || 'postgres';
const DB_PASS = process.env.DB_PASS || 'password';
const DB_HOST = process.env.DB_HOST || 'localhost';

const pool = new Pool({
    user: DB_USER,
    password: DB_PASS,
    host: DB_HOST,
    database: DB_NAME
});

pool.query('SELECT id, title, upvotes, "createdAt" FROM "RoadmapItems" ORDER BY upvotes DESC').then(res => {
    fs.writeFileSync('test_out.json', JSON.stringify(res.rows, null, 2));
}).catch(console.error).finally(() => process.exit(0));
