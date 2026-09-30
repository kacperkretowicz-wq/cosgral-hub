-- Migration 015: Add Google Drive file ID to portal_files
-- Run this in Supabase SQL Editor

-- Add gdrive_file_id column (nullable — old rows keep Supabase storage)
ALTER TABLE portal_files
  ADD COLUMN IF NOT EXISTS gdrive_file_id TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS gdrive_folder_id TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS storage_provider TEXT NOT NULL DEFAULT 'supabase';
  -- storage_provider: 'supabase' | 'gdrive'

-- For fast lookups by file id
CREATE INDEX IF NOT EXISTS idx_portal_files_gdrive ON portal_files (gdrive_file_id)
  WHERE gdrive_file_id IS NOT NULL;

COMMENT ON COLUMN portal_files.gdrive_file_id IS
  'Google Drive file ID — set when storage_provider = gdrive';
COMMENT ON COLUMN portal_files.storage_provider IS
  'Where the binary is stored: supabase (legacy) or gdrive (current)';
