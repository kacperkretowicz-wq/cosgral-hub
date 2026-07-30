-- Cosgral Hub — structured Juicy-style offer document

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS offer_document JSONB;

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS offer_ready BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN clients.offer_document IS 'Structured OfferDocument (Juicy-style layout)';
COMMENT ON COLUMN clients.offer_ready IS 'When true, offer can be shared / exported as PDF';
