CREATE TABLE feedback (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id      UUID        NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  decision_id  UUID        NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vote         TEXT        NOT NULL CHECK (vote IN ('thumbs_up', 'thumbs_down')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own_feedback"
  ON feedback FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own_feedback"
  ON feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX feedback_decision_id_idx ON feedback (decision_id);
