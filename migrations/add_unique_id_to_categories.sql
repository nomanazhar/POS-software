-- Migration: Add unique_id column to categories table
-- This migration adds the unique_id column to existing categories tables

-- Add unique_id column if it doesn't exist
ALTER TABLE categories ADD COLUMN unique_id TEXT;

-- Update existing records with unique_id based on company_id, branch_id, and categoryId
UPDATE categories 
SET unique_id = company_id || '_' || branch_id || '_cat_' || categoryId 
WHERE unique_id IS NULL;

-- Make unique_id NOT NULL after populating existing records
-- Note: This might fail if there are NULL values, so we ensure all records are updated first
-- ALTER TABLE categories ALTER COLUMN unique_id SET NOT NULL; 