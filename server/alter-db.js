const { sequelize } = require('./config/database');
async function run() {
    try {
        await sequelize.query('ALTER TABLE "WaStores" ADD COLUMN "lastViewedOrdersAt" TIMESTAMP WITH TIME ZONE');
    } catch(e) {}
    try {
        await sequelize.query('ALTER TABLE "WaStores" ADD COLUMN "lastViewedCustomersAt" TIMESTAMP WITH TIME ZONE');
    } catch(e) {}
    try {
        await sequelize.query('ALTER TABLE "WaStores" ADD COLUMN "lastViewedAbandonedCartsAt" TIMESTAMP WITH TIME ZONE');
    } catch(e) {}
    console.log('Done');
    process.exit(0);
}
run();
