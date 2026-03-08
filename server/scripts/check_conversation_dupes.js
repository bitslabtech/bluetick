require('dotenv').config({ path: __dirname + '/../.env' });
const { sequelize } = require('../config/database');

const checkDupes = async () => {
    try {
        await sequelize.authenticate();
        console.log("Connected. Checking for duplicate Conversations...");

        // 1. Find Phone Numbers with multiple conversations for same user
        const [results] = await sequelize.query(`
            SELECT "userId", "phoneNumber", COUNT(*) as count, array_agg(id) as ids
            FROM "Conversations"
            GROUP BY "userId", "phoneNumber"
            HAVING COUNT(*) > 1;
        `);

        if (results.length === 0) {
            console.log("No duplicate conversations found.");
        } else {
            console.log("Found Duplicates:");
            console.table(results);

            // Show details for the first one
            const firstDupe = results[0];
            const [details] = await sequelize.query(`
                SELECT * FROM "Conversations" 
                WHERE "phoneNumber" = '${firstDupe.phoneNumber}'
                AND "userId" = '${firstDupe.userId}'
            `);
            console.log("Details for " + firstDupe.phoneNumber + ":");
            console.table(details);
        }

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await sequelize.close();
    }
};

checkDupes();
