-- Migration: Update bot_configs table to support property/client hierarchy
-- Date: 2025-11-15

-- Add new columns
ALTER TABLE bot_configs ADD COLUMN property_id TEXT;
ALTER TABLE bot_configs ADD COLUMN scope TEXT NOT NULL DEFAULT 'global';

-- Create foreign key for property_id (if not exists)
-- Note: SQLite doesn't support adding constraints after creation,
-- so we'll handle this in the application layer

-- Create indexes for faster hierarchy lookups
CREATE INDEX IF NOT EXISTS idx_bot_configs_property_id ON bot_configs(property_id);
CREATE INDEX IF NOT EXISTS idx_bot_configs_scope ON bot_configs(scope);

-- Update existing records to have 'global' scope
UPDATE bot_configs SET scope = 'global' WHERE scope IS NULL OR scope = '';

-- Update client-specific configs
UPDATE bot_configs SET scope = 'client' WHERE client_id IS NOT NULL;

