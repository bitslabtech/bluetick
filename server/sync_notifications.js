const { sequelize } = require('./config/database');
const SystemNotification = require('./models/SystemNotification');

const syncDB = async () => {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');
        await SystemNotification.sync({ alter: true });
        console.log('SystemNotification table synced.');
        process.exit();
    } catch (err) {
        console.error('Error syncing:', err);
        process.exit(1);
    }
};

syncDB();
