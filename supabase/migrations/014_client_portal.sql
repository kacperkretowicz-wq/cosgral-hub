-- Migration 014: Client Portal — Shared Drive
-- Klienci CRM otrzymują udostępniony katalog plików z czatem i notatkami

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── portal_slug in crm_clients ─────────────────────────────────────────────
ALTER TABLE crm_clients ADD COLUMN IF NOT EXISTS portal_slug TEXT UNIQUE;

-- Generate slugs for all existing clients that don't have one yet
DO $$
DECLARE
  rec RECORD;
  base_slug TEXT;
  candidate TEXT;
  suffix TEXT;
  counter INT;
BEGIN
  FOR rec IN SELECT id, company_name FROM crm_clients WHERE portal_slug IS NULL LOOP
    -- Normalize: lowercase, replace spaces/special chars with hyphens, trim
    base_slug := lower(regexp_replace(
      translate(rec.company_name,
        'ąćęłńóśźżĄĆĘŁŃÓŚŹŻàáâãäåæçèéêëìíîïðñòóôõöùúûüý',
        'acelnoszzACELNOSZZaaaaaaaceeeeiiiiinooooouuuuy'
      ),
      '[^a-z0-9]+', '-', 'g'
    ));
    base_slug := trim(both '-' from base_slug);
    IF length(base_slug) = 0 THEN
      base_slug := 'klient';
    END IF;
    IF length(base_slug) > 40 THEN
      base_slug := substring(base_slug from 1 for 40);
    END IF;

    -- Add 4-char random suffix to ensure uniqueness
    counter := 0;
    LOOP
      suffix := substring(md5(random()::text) from 1 for 4);
      candidate := base_slug || '-' || suffix;
      EXIT WHEN NOT EXISTS (SELECT 1 FROM crm_clients WHERE portal_slug = candidate);
      counter := counter + 1;
      EXIT WHEN counter > 20;  -- safety valve
    END LOOP;

    UPDATE crm_clients SET portal_slug = candidate WHERE id = rec.id;
  END LOOP;
END $$;

-- Index for fast slug lookups
CREATE INDEX IF NOT EXISTS idx_crm_clients_portal_slug ON crm_clients(portal_slug);

-- ── portal_access_requests ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS portal_access_requests (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  crm_client_id    UUID NOT NULL REFERENCES crm_clients(id) ON DELETE CASCADE,
  requester_name   TEXT NOT NULL,
  requester_email  TEXT NOT NULL DEFAULT '',
  status           TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'approved', 'rejected')),
  -- session token set when approved — client uses this as auth cookie value
  token            UUID NOT NULL DEFAULT uuid_generate_v4(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portal_requests_client ON portal_access_requests(crm_client_id);
CREATE INDEX IF NOT EXISTS idx_portal_requests_status ON portal_access_requests(status);
CREATE INDEX IF NOT EXISTS idx_portal_requests_token  ON portal_access_requests(token);

ALTER TABLE portal_access_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "portal_requests_service_role" ON portal_access_requests
  USING (auth.role() = 'service_role');

-- ── portal_files ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS portal_files (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  crm_client_id   UUID NOT NULL REFERENCES crm_clients(id) ON DELETE CASCADE,
  file_name       TEXT NOT NULL,
  mime_type       TEXT NOT NULL DEFAULT '',
  storage_path    TEXT NOT NULL,          -- path inside Supabase bucket
  public_url      TEXT,                   -- direct public URL (if bucket is public)
  uploaded_by     TEXT NOT NULL DEFAULT 'admin'  CHECK (uploaded_by IN ('admin', 'client')),
  uploader_name   TEXT,                   -- name of client who uploaded
  size_bytes      BIGINT DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portal_files_client     ON portal_files(crm_client_id);
CREATE INDEX IF NOT EXISTS idx_portal_files_created_at ON portal_files(created_at DESC);

ALTER TABLE portal_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "portal_files_service_role" ON portal_files
  USING (auth.role() = 'service_role');

-- ── portal_notes ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS portal_notes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  crm_client_id   UUID NOT NULL REFERENCES crm_clients(id) ON DELETE CASCADE,
  content         TEXT NOT NULL,
  author          TEXT NOT NULL DEFAULT 'admin'  CHECK (author IN ('admin', 'client')),
  author_name     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portal_notes_client     ON portal_notes(crm_client_id);
CREATE INDEX IF NOT EXISTS idx_portal_notes_created_at ON portal_notes(created_at DESC);

ALTER TABLE portal_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "portal_notes_service_role" ON portal_notes
  USING (auth.role() = 'service_role');

-- ── portal_messages ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS portal_messages (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  crm_client_id   UUID NOT NULL REFERENCES crm_clients(id) ON DELETE CASCADE,
  sender          TEXT NOT NULL DEFAULT 'admin'  CHECK (sender IN ('admin', 'client')),
  sender_name     TEXT NOT NULL DEFAULT 'Cosgral',
  content         TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portal_messages_client     ON portal_messages(crm_client_id);
CREATE INDEX IF NOT EXISTS idx_portal_messages_created_at ON portal_messages(created_at DESC);

ALTER TABLE portal_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "portal_messages_service_role" ON portal_messages
  USING (auth.role() = 'service_role');

-- ── Auto-update updated_at triggers ──────────────────────────────────────
CREATE OR REPLACE FUNCTION portal_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS portal_requests_updated_at ON portal_access_requests;
CREATE TRIGGER portal_requests_updated_at
  BEFORE UPDATE ON portal_access_requests
  FOR EACH ROW EXECUTE FUNCTION portal_set_updated_at();

DROP TRIGGER IF EXISTS portal_notes_updated_at ON portal_notes;
CREATE TRIGGER portal_notes_updated_at
  BEFORE UPDATE ON portal_notes
  FOR EACH ROW EXECUTE FUNCTION portal_set_updated_at();
