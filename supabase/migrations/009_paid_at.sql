-- Cosgral OS — paid_at for accurate revenue MTD

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS paid_at DATE;

CREATE INDEX IF NOT EXISTS idx_projects_paid_at ON projects(paid_at);
