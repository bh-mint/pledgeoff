-- M2M junction table: which signals contributed to each decision
-- Replaces the signal_ids UUID[] array on decisions (kept for backwards compat)

CREATE TABLE decision_signals (
  decision_id  UUID NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
  signal_id    UUID NOT NULL REFERENCES signals(id)   ON DELETE CASCADE,
  relevance    NUMERIC(4,3) NOT NULL DEFAULT 1.0 CHECK (relevance >= 0 AND relevance <= 1),
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
  PRIMARY KEY (decision_id, signal_id)
);

ALTER TABLE decision_signals ENABLE ROW LEVEL SECURITY;

-- Users can read decision_signals for their own decisions
CREATE POLICY "users_select_decision_signals_for_own_decisions"
  ON decision_signals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM decisions d
      JOIN ideas i ON i.id = d.idea_id
      WHERE d.id = decision_signals.decision_id
        AND i.user_id = auth.uid()
    )
  );

-- Written by service role only (bypasses RLS)

CREATE INDEX decision_signals_decision_id_idx ON decision_signals (decision_id);
CREATE INDEX decision_signals_signal_id_idx   ON decision_signals (signal_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON decision_signals TO service_role;
GRANT SELECT ON decision_signals TO authenticated;
