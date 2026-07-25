-- Google Doc per klient (teksty z formularza materiałów)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS drive_doc_id TEXT;
