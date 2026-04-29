CREATE TABLE signals (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id     UUID        NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  source      TEXT        NOT NULL CHECK (source IN ('reddit', 'github')),
  url         TEXT        NOT NULL,
  title       TEXT        NOT NULL,
  summary     TEXT        NOT NULL DEFAULT '',
  sentiment   TEXT        NOT NULL CHECK (sentiment IN ('positive', 'negative', 'neutral')),
  fetched_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE signals ENABLE ROW LEVEL SECURITY;

-- Users can read signals for their own ideas
CREATE POLICY "users_select_signals_for_own_ideas"
  ON signals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ideas
      WHERE ideas.id = signals.idea_id
        AND ideas.user_id = auth.uid()
    )
  );

-- Signals are written by the backend via service role (bypasses RLS)

CREATE INDEX signals_idea_id_idx ON signals (idea_id);

-- Idempotency: same URL cannot be ingested twice per source
CREATE UNIQUE INDEX signals_source_url_unique ON signals (source, url);
