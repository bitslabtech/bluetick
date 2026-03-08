require('dotenv').config({ path: __dirname + '/../.env' });
const { sequelize } = require('../config/database');

const inspect = async () => {
    try {
        await sequelize.authenticate();
        console.log("Connected. Inspecting 'Conversations' table...");

        const [results] = await sequelize.query(`
            SELECT conname, contype
            FROM pg_constraint
            WHERE conrelid = 'Conversations'::regclass
        `);
        console.table(results);

        const [indexes] = await sequelize.query(`
            SELECT indexname, indexdef
            FROM pg_indexes
            WHERE tablename = 'Conversations';
        `);
        console.table(indexes);

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await sequelize.close();
    }
};

inspect();
