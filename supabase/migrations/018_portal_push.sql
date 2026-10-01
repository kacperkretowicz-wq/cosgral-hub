-- Migration 018: Portal Push Subscriptions
-- Klienci portalu mogą włączyć Web Push Notifications na swoich urządzeniach

CREATE TABLE IF NOT EXISTS portal_push_subscriptions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crm_client_id   UUID NOT NULL REFERENCES crm_clients(id) ON DELETE CASCADE,
  endpoint        TEXT NOT NULL UNIQUE,
  keys_p256dh     TEXT NOT NULL,
  keys_auth       TEXT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS portal_push_subs_client_idx ON portal_push_subscriptions (crm_client_id);

ALTER TABLE portal_push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "portal_push_service_role" ON portal_push_subscriptions
  FOR ALL USING (auth.role() = 'service_role');
