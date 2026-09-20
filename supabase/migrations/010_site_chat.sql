-- Site live chat (agency widget ↔ Hub admin). Retention: 24h.

CREATE TABLE IF NOT EXISTS site_chat_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_key TEXT NOT NULL,
  page_url TEXT DEFAULT '',
  user_agent TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_site_chat_threads_visitor
  ON site_chat_threads(visitor_key);

CREATE INDEX IF NOT EXISTS idx_site_chat_threads_last
  ON site_chat_threads(last_message_at DESC);

CREATE TABLE IF NOT EXISTS site_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES site_chat_threads(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('visitor', 'agent')),
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_site_chat_messages_thread
  ON site_chat_messages(thread_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_site_chat_messages_created
  ON site_chat_messages(created_at);

ALTER TABLE site_chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated manage site_chat_threads" ON site_chat_threads;
CREATE POLICY "Authenticated manage site_chat_threads"
  ON site_chat_threads FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated manage site_chat_messages" ON site_chat_messages;
CREATE POLICY "Authenticated manage site_chat_messages"
  ON site_chat_messages FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Public access is only via Hub service-role API (not anon RLS inserts).
