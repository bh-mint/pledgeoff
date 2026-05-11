-- Migration: create customer_analyses table
-- P11: Customer Intelligence

CREATE TABLE IF NOT EXISTS customer_analyses (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id     UUID        NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  segments    JSONB       NOT NULL DEFAULT '[]',
  pain_points JSONB       NOT NULL DEFAULT '[]',
  sentiment   JSONB       NOT NULL DEFAULT '{}',
  quotes      JSONB       NOT NULL DEFAULT '[]',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS customer_analyses_idea_id_idx ON customer_analyses(idea_id);
CREATE INDEX IF NOT EXISTS customer_analyses_user_id_idx ON customer_analyses(user_id);

-- RLS
ALTER TABLE customer_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can read own customer analyses"
  ON customer_analyses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users can insert own customer analyses"
  ON customer_analyses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Service role access
GRANT SELECT, INSERT, UPDATE, DELETE ON customer_analyses TO service_role;
