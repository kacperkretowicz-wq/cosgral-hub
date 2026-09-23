-- Align billing_status enum with app aliases + CRM tags column

ALTER TYPE billing_status ADD VALUE IF NOT EXISTS 'w_toku';
ALTER TYPE billing_status ADD VALUE IF NOT EXISTS 'rozliczone';

ALTER TABLE crm_clients
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';
