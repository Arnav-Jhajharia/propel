-- Migration: Add bot_configs table for automation rules
-- Date: 2025-11-15

CREATE TABLE IF NOT EXISTS bot_configs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  client_id TEXT,
  name TEXT NOT NULL,
  natural_language_input TEXT NOT NULL,
  parsed_config TEXT NOT NULL,
  is_active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_bot_configs_user_id ON bot_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_bot_configs_client_id ON bot_configs(client_id);
CREATE INDEX IF NOT EXISTS idx_bot_configs_active ON bot_configs(is_active);

