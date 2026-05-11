-- Migration: create build_analyses table
-- P12: Engineering Intelligence

CREATE TABLE IF NOT EXISTS build_analyses (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id      UUID        NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stack        JSONB       NOT NULL DEFAULT '[]',
  gaps         JSONB       NOT NULL DEFAULT '[]',
  signal_count INTEGER     NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS build_analyses_idea_id_idx ON build_analyses(idea_id);
CREATE INDEX IF NOT EXISTS build_analyses_user_id_idx ON build_analyses(user_id);

-- RLS
ALTER TABLE build_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can read own build analyses"
  ON build_analyses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users can insert own build analyses"
  ON build_analyses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Service role access
GRANT SELECT, INSERT, UPDATE, DELETE ON build_analyses TO service_role;
