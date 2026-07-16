require('dotenv').config({ path: '../.env' }); // or just require('dotenv').config({ path: __dirname + '/../.env' });
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { sequelize } = require('../config/database');

async function updateDb() {
  try {
    await sequelize.query('ALTER TABLE "Users" ADD COLUMN "lastSeenRoadmapAt" TIMESTAMP WITH TIME ZONE;');
    console.log('Column added successfully.');
  } catch (err) {
    console.log('Column might already exist or error:', err.message);
  } finally {
    process.exit(0);
  }
}

updateDb();
