-- Migration: Support team_members in StoreItems table
-- Fixes: invalid input value for enum "enum_StoreItems_itemType": "team_members"

-- 1. Add 'team_members' to enum_StoreItems_itemType (if the enum exists in PostgreSQL)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_StoreItems_itemType') THEN
        ALTER TYPE "enum_StoreItems_itemType" ADD VALUE IF NOT EXISTS 'team_members';
    END IF;
END $$;

-- 2. Convert "itemType" column from ENUM to VARCHAR(50)
-- Matches DataTypes.STRING(30) in StoreItem.js and permanently prevents enum constraint errors
ALTER TABLE "StoreItems" 
ALTER COLUMN "itemType" TYPE VARCHAR(50) USING "itemType"::text;

-- 3. Ensure validityMonths column exists on StoreItems
ALTER TABLE "StoreItems" 
ADD COLUMN IF NOT EXISTS "validityMonths" INTEGER DEFAULT 12;

-- 4. Ensure Users table has the extra team member top-up columns
ALTER TABLE "Users" 
ADD COLUMN IF NOT EXISTS "extraTopupTeamMembers" INTEGER DEFAULT 0;

ALTER TABLE "Users" 
ADD COLUMN IF NOT EXISTS "teamMemberTopupExpiry" TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- 5. Verification query
SELECT column_name, data_type, udt_name 
FROM information_schema.columns 
WHERE table_name = 'StoreItems' AND column_name IN ('itemType', 'validityMonths');
