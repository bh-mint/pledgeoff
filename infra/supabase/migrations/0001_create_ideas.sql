CREATE TABLE ideas (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text        TEXT        NOT NULL CHECK (char_length(text) >= 10 AND char_length(text) <= 2000),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE ideas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own_ideas"
  ON ideas FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own_ideas"
  ON ideas FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX ideas_user_id_idx ON ideas (user_id);
