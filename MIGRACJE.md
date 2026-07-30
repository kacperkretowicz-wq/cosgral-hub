# Migracje Supabase (007 + 008)

Uruchom w SQL Editorze projektu Supabase (kolejność ważna). Pełne pliki:

- [`supabase/migrations/007_offer_document.sql`](supabase/migrations/007_offer_document.sql)
- [`supabase/migrations/008_agency_os.sql`](supabase/migrations/008_agency_os.sql)

## 007 — oferta Cosgral (`offer_document`)

Dodaje kolumny strukturalnej oferty Juicy / Cosgral na tabeli `clients`.

```sql
-- Cosgral Hub — structured Juicy-style offer document

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS offer_document JSONB;

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS offer_ready BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN clients.offer_document IS 'Structured OfferDocument (Juicy-style layout)';
COMMENT ON COLUMN clients.offer_ready IS 'When true, offer can be shared / exported as PDF';
```

## 008 — Cosgral OS (harmonogram, leady, finanse)

Dodaje `value_pln` / `cost_pln` / `billing_status` na `projects` oraz tabele `tasks` i `leads`.

```sql
-- Cosgral OS — schedule, leads, project money

DO $$ BEGIN
  CREATE TYPE task_status AS ENUM ('todo', 'doing', 'done');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE lead_status AS ENUM (
    'nowy', 'kontakt', 'oferta', 'wygrana', 'przegrana'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE billing_status AS ENUM (
    'wycena', 'faktura', 'oplacone', 'anulowane'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS value_pln NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS cost_pln NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS billing_status billing_status NOT NULL DEFAULT 'wycena';

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  assignee TEXT NOT NULL,
  status task_status NOT NULL DEFAULT 'todo',
  due_date DATE,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  source TEXT NOT NULL DEFAULT 'website',
  status lead_status NOT NULL DEFAULT 'nowy',
  message TEXT DEFAULT '',
  crm_client_id UUID REFERENCES crm_clients(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_due ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_projects_billing ON projects(billing_status);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated manage tasks" ON tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated manage leads" ON leads FOR ALL TO authenticated USING (true) WITH CHECK (true);
```

Wcześniejsze migracje (001–006) — zobacz `supabase/migrations/` oraz `SETUP.md`.
