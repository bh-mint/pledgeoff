CREATE TABLE decisions (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id     UUID         NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  verdict     TEXT         NOT NULL CHECK (verdict IN ('GO', 'KILL', 'PIVOT')),
  reasoning   TEXT         NOT NULL CHECK (char_length(reasoning) >= 1),
  confidence  NUMERIC(4,3) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  signal_ids  UUID[]       NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

ALTER TABLE decisions ENABLE ROW LEVEL SECURITY;

-- Users can read decisions for their own ideas
CREATE POLICY "users_select_decisions_for_own_ideas"
  ON decisions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ideas
      WHERE ideas.id = decisions.idea_id
        AND ideas.user_id = auth.uid()
    )
  );

-- Decisions are written by the backend via service role (bypasses RLS)

CREATE INDEX decisions_idea_id_idx ON decisions (idea_id);
