CREATE TABLE IF NOT EXISTS simulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tam_low BIGINT NOT NULL,
  tam_high BIGINT NOT NULL,
  scenarios JSONB NOT NULL,
  break_even_months INTEGER NOT NULL,
  assumptions JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS simulations_idea_id_idx ON simulations(idea_id);
CREATE INDEX IF NOT EXISTS simulations_user_id_idx ON simulations(user_id);

ALTER TABLE simulations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own simulations"
  ON simulations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own simulations"
  ON simulations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT ON simulations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON simulations TO service_role;
