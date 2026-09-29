-- Migration 013: SM Posts table
-- Cosgral Social Media automation queue

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS sm_posts (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  platform         TEXT NOT NULL CHECK (platform IN ('instagram', 'facebook', 'linkedin')),
  post_type        TEXT NOT NULL CHECK (post_type IN ('static', 'carousel', 'story', 'reel', 'text')),
  theme            TEXT NOT NULL,
  caption          TEXT NOT NULL DEFAULT '',
  hashtags         TEXT[] DEFAULT '{}',
  image_url        TEXT,
  image_urls       TEXT[],
  video_url        TEXT,
  status           TEXT NOT NULL DEFAULT 'draft'
                   CHECK (status IN ('draft', 'approved', 'rejected', 'scheduled', 'published', 'failed')),
  platform_post_id TEXT,
  scheduled_at     TIMESTAMPTZ,
  published_at     TIMESTAMPTZ,
  error_message    TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION sm_posts_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sm_posts_updated_at ON sm_posts;
CREATE TRIGGER sm_posts_updated_at
  BEFORE UPDATE ON sm_posts
  FOR EACH ROW EXECUTE FUNCTION sm_posts_set_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sm_posts_status       ON sm_posts(status);
CREATE INDEX IF NOT EXISTS idx_sm_posts_platform     ON sm_posts(platform);
CREATE INDEX IF NOT EXISTS idx_sm_posts_scheduled_at ON sm_posts(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_sm_posts_created_at   ON sm_posts(created_at DESC);

-- RLS
ALTER TABLE sm_posts ENABLE ROW LEVEL SECURITY;

-- Service role has full access (used by API routes)
CREATE POLICY "sm_posts_service_role" ON sm_posts
  USING (auth.role() = 'service_role');

-- Analytics snapshot table
CREATE TABLE IF NOT EXISTS sm_analytics (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  platform      TEXT NOT NULL,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  followers     INTEGER,
  posts_count   INTEGER,
  avg_reach     NUMERIC(10,2),
  engagement    NUMERIC(5,4),
  raw_data      JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (platform, snapshot_date)
);

ALTER TABLE sm_analytics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sm_analytics_service_role" ON sm_analytics
  USING (auth.role() = 'service_role');
