-- SQL script to fix multiple default plans
-- Run this in your PostgreSQL client to ensure only 1 plan is default

-- First, unset all defaults
UPDATE "Plans" SET "isDefault" = false WHERE "isDefault" = true;

-- Then, set the first Free plan as default (or specify the plan you want)
UPDATE "Plans" 
SET "isDefault" = true, "isPublic" = false 
WHERE name = 'Free' 
LIMIT 1;

-- Check the result
SELECT id, name, "isDefault", "isPublic" FROM "Plans";
