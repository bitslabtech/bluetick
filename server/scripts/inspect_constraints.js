require('dotenv').config({ path: __dirname + '/../.env' });
const { sequelize } = require('../config/database');

const inspect = async () => {
    try {
        await sequelize.authenticate();
        console.log("Connected. Fetching constraints...");

        // Query to find constraints on Contacts table
        const [results, metadata] = await sequelize.query(`
            SELECT conname, contype
            FROM pg_constraint
            WHERE conrelid = (
                SELECT oid 
                FROM pg_class 
                WHERE relname = 'Contacts'
            )
        `);

        console.log("Constraints Table: 'Contacts'");
        console.table(results);

        // Also check Indexes
        const [indexes] = await sequelize.query(`
            SELECT indexname, indexdef
            FROM pg_indexes
            WHERE tablename = 'Contacts';
        `);
        console.log("Indexes Table: 'Contacts'");
        console.table(indexes);

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await sequelize.close();
    }
};

inspect();
