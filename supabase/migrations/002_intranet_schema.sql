-- Cosgral Hub — intranet schema

DO $$ BEGIN
  CREATE TYPE service_type AS ENUM (
    'strona_www', 'system_crm', 'automatyzacja_ecommerce',
    'grafika', 'montaz_wideo', 'kampania_meta', 'kampania_google', 'inne'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE project_status AS ENUM (
    'nowe', 'w_trakcie', 'oczekuje', 'zakonczone', 'anulowane'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS crm_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  industry TEXT,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  crm_client_id UUID REFERENCES crm_clients(id) ON DELETE SET NULL,
  website_client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  service_type service_type NOT NULL DEFAULT 'inne',
  status project_status NOT NULL DEFAULT 'nowe',
  assigned_to TEXT,
  deadline DATE,
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  crm_client_id UUID REFERENCES crm_clients(id) ON DELETE CASCADE,
  author_email TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS resource_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  crm_client_id UUID REFERENCES crm_clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_clients_name ON crm_clients(company_name);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_crm_client ON projects(crm_client_id);
CREATE INDEX IF NOT EXISTS idx_notes_project ON notes(project_id);
CREATE INDEX IF NOT EXISTS idx_notes_crm_client ON notes(crm_client_id);
CREATE INDEX IF NOT EXISTS idx_links_project ON resource_links(project_id);
CREATE INDEX IF NOT EXISTS idx_links_crm_client ON resource_links(crm_client_id);

ALTER TABLE crm_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated manage crm_clients" ON crm_clients;
CREATE POLICY "Authenticated manage crm_clients" ON crm_clients FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated manage projects" ON projects;
CREATE POLICY "Authenticated manage projects" ON projects FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated manage notes" ON notes;
CREATE POLICY "Authenticated manage notes" ON notes FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated manage resource_links" ON resource_links;
CREATE POLICY "Authenticated manage resource_links" ON resource_links FOR ALL TO authenticated USING (true) WITH CHECK (true);
