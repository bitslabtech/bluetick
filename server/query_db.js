require('dotenv').config();
const { Client } = require('pg');
const client = new Client({
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME
});
client.connect().then(() => {
    return client.query('SELECT id, name, slug, "userId" FROM "WaStores"');
}).then(res => {
    console.log(res.rows);
}).catch(console.error).finally(() => {
    client.end();
});
