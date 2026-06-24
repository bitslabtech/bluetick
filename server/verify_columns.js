require('dotenv').config();
const { sequelize } = require('./config/database');
const sql = `SELECT table_name, column_name, data_type, character_maximum_length 
             FROM information_schema.columns 
             WHERE table_name IN ('Settings', 'Users') 
               AND column_name IN ('metaAccessToken', 'fbAccessToken') 
             ORDER BY table_name, column_name`;
sequelize.query(sql).then(([rows]) => {
    console.log('\nColumn types after migration:');
    rows.forEach(r => {
        const limit = r.character_maximum_length ? `(max ${r.character_maximum_length})` : '(unlimited)';
        console.log(`  ${r.table_name}.${r.column_name}: ${r.data_type} ${limit}`);
    });
    process.exit(0);
}).catch(e => { console.error(e.message); process.exit(1); });
