-- Cosgral Portal schema

CREATE TYPE page_type AS ENUM ('onepage', 'multipage');
CREATE TYPE client_status AS ENUM ('draft', 'sent', 'submitted');

CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  industry TEXT,
  page_type page_type NOT NULL DEFAULT 'onepage',
  deadline DATE,
  token TEXT UNIQUE NOT NULL,
  drive_folder_id TEXT,
  drive_section_folders JSONB DEFAULT '{}',
  inspirations JSONB DEFAULT '[]',
  status client_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  section_key TEXT NOT NULL,
  field_key TEXT NOT NULL,
  text_content TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(client_id, section_key, field_key)
);

CREATE TABLE files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  section_key TEXT NOT NULL,
  drive_file_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_clients_token ON clients(token);
CREATE INDEX idx_submissions_client ON submissions(client_id);
CREATE INDEX idx_files_client ON files(client_id);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;

-- Public read by token (via service role in API)
-- Admin full access via authenticated users
CREATE POLICY "Authenticated users can manage clients"
  ON clients FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can manage submissions"
  ON submissions FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can manage files"
  ON files FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
