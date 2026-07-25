-- Supabase Storage bucket for client material uploads (Netlify / bez Google Drive)

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('client-materials', 'client-materials', false, 52428800)
ON CONFLICT (id) DO NOTHING;

-- Service role uploads via API; admin pobiera przez signed URL (service role w API)
