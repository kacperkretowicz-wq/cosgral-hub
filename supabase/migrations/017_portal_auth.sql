-- Migration 017: Portal Auth — self-service client credentials
-- Clients create their own login/password/PIN instead of requesting access.

-- Portal auth table
CREATE TABLE IF NOT EXISTS portal_auth (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crm_client_id       UUID UNIQUE NOT NULL REFERENCES crm_clients(id) ON DELETE CASCADE,
  username            TEXT NOT NULL,
  username_lower      TEXT UNIQUE NOT NULL,           -- normalised for case-insensitive lookup
  password_hash       TEXT NOT NULL,                  -- scrypt(password + salt)
  password_salt       TEXT NOT NULL,
  pin_hash            TEXT,                           -- scrypt(4-digit PIN + salt), nullable
  pin_salt            TEXT,
  session_token       TEXT UNIQUE,
  session_expires_at  TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE portal_auth ENABLE ROW LEVEL SECURITY;

CREATE POLICY "portal_auth_service_role"
  ON portal_auth FOR ALL
  USING (auth.role() = 'service_role');

-- Index for fast session lookup
CREATE INDEX IF NOT EXISTS portal_auth_session_token_idx ON portal_auth (session_token)
  WHERE session_token IS NOT NULL;

-- Also add DELETE route support for portal_messages via portal_messages id
-- (no schema change needed — existing table already has id + crm_client_id)
