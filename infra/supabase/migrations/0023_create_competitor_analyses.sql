-- competitor_analyses: stores AI-generated competitor intelligence per idea
CREATE TABLE IF NOT EXISTS competitor_analyses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id     UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  competitors JSONB NOT NULL DEFAULT '[]',
  gaps        JSONB NOT NULL DEFAULT '[]',
  signal_count INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS competitor_analyses_idea_id_idx ON competitor_analyses(idea_id);

ALTER TABLE competitor_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own competitor analyses"
  ON competitor_analyses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own competitor analyses"
  ON competitor_analyses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT ON competitor_analyses TO authenticated;
GRANT ALL ON competitor_analyses TO service_role;
