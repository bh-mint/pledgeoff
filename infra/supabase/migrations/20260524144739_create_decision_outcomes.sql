-- M10: Data Flywheel — user-reported outcomes on ideas.
-- outcome_type: what happened after the decision was made.

CREATE TYPE public.outcome_type AS ENUM (
  'built_worked',   -- built it, it worked
  'built_failed',   -- built it, it didn't work
  'not_built'       -- decided not to build
);

CREATE TABLE public.decision_outcomes (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id          UUID        NOT NULL REFERENCES public.ideas(id) ON DELETE CASCADE,
  user_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  verdict_at_time  TEXT        NOT NULL, -- GO / KILL / PIVOT snapshot at outcome time
  outcome_type     public.outcome_type NOT NULL,
  notes            TEXT,
  reported_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT decision_outcomes_idea_user_unique UNIQUE (idea_id, user_id)
);

CREATE INDEX decision_outcomes_user_idx ON public.decision_outcomes (user_id);
CREATE INDEX decision_outcomes_verdict_idx ON public.decision_outcomes (verdict_at_time, outcome_type);

ALTER TABLE public.decision_outcomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own outcomes"
  ON public.decision_outcomes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users insert own outcomes"
  ON public.decision_outcomes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users update own outcomes"
  ON public.decision_outcomes FOR UPDATE
  USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.decision_outcomes TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.decision_outcomes TO authenticated;

-- Rollback: DROP TABLE public.decision_outcomes; DROP TYPE public.outcome_type;
