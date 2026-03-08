-- Migration: Add errorMessage column to Messages table
-- Run this if the server auto-sync (sequelize.sync alter:true) is not being used.

ALTER TABLE "Messages"
ADD COLUMN IF NOT EXISTS "errorMessage" TEXT DEFAULT NULL;

-- Verify
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'Messages' AND column_name = 'errorMessage';
