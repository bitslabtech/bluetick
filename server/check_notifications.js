require('dotenv').config();
const { sequelize } = require('./config/database');
const SystemNotification = require('./models/SystemNotification');

async function check() {
    try {
        await sequelize.authenticate();
        console.log('Connection has been established successfully.');

        const notifications = await SystemNotification.findAll();
        console.log(`Total Notifications: ${notifications.length}`);

        notifications.forEach(n => {
            console.log(`ID: ${n.id} | Title: ${n.title} | Status: ${n.status} | Recipient: ${n.recipient} | Target: ${n.target}`);
        });

    } catch (error) {
        console.error('Unable to connect to the database:', error);
    } finally {
        await sequelize.close();
    }
}

check();
