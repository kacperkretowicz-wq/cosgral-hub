-- Site chat: AI vs human, trash, thread previews (Hub admin)

ALTER TABLE site_chat_threads
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_message_preview TEXT,
  ADD COLUMN IF NOT EXISTS last_message_role TEXT,
  ADD COLUMN IF NOT EXISTS last_message_author TEXT;

ALTER TABLE site_chat_messages
  ADD COLUMN IF NOT EXISTS author TEXT;

DROP INDEX IF EXISTS idx_site_chat_threads_visitor;

CREATE UNIQUE INDEX IF NOT EXISTS idx_site_chat_threads_visitor_active
  ON site_chat_threads(visitor_key)
  WHERE deleted_at IS NULL;
