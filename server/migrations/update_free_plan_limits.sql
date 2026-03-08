-- Update Free Plan Limits in Database
-- Run this SQL in your PostgreSQL database

UPDATE "Plans" 
SET 
    "messageLimit" = 30,
    "contactLimit" = 10,
    "templateLimit" = 2,
    "updatedAt" = NOW()
WHERE "name" = 'Free';

-- Verify the update
SELECT "name", "messageLimit", "contactLimit", "templateLimit" 
FROM "Plans" 
WHERE "name" = 'Free';
