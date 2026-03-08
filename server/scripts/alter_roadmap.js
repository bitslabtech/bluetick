const { sequelize } = require('../config/database');
const RoadmapItem = require('../models/RoadmapItem');

async function run() {
    await RoadmapItem.sync({ alter: true });
    console.log("RoadmapItem synced.");
    process.exit(0);
}
run();
