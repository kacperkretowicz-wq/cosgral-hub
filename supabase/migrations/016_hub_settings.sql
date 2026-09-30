-- Migration 016: hub_settings — key-value store for runtime config
-- Used to cache Google Drive root folder ID and other dynamic settings

CREATE TABLE IF NOT EXISTS hub_settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE hub_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hub_settings_service_role" ON hub_settings
  USING (auth.role() = 'service_role');

COMMENT ON TABLE hub_settings IS
  'Runtime key-value config for Cosgral Hub (e.g. gdrive_root_folder_id)';
