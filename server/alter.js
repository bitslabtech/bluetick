const { sequelize } = require('./config/database');
sequelize.query('ALTER TABLE "Plans" ADD COLUMN IF NOT EXISTS "taxEnabled" BOOLEAN DEFAULT false; ALTER TABLE "Plans" ADD COLUMN IF NOT EXISTS "taxText" VARCHAR(255) DEFAULT \'excluding 18% GST\';')
  .then(() => {
    console.log('Columns added successfully');
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
