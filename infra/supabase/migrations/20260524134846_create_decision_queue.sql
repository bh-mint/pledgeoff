-- Decision Queue: stores AI-prioritized idea ordering per user.
-- Updated daily by cron; email alert when priority_score shifts >20%.

CREATE TABLE public.decision_queue (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  idea_id             UUID        NOT NULL REFERENCES public.ideas(id) ON DELETE CASCADE,
  priority_score      FLOAT       NOT NULL DEFAULT 0,
  last_signal_change  TIMESTAMPTZ,
  change_summary      TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT decision_queue_user_idea_unique UNIQUE (user_id, idea_id)
);

CREATE INDEX decision_queue_user_priority_idx
  ON public.decision_queue (user_id, priority_score DESC);

ALTER TABLE public.decision_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own queue"
  ON public.decision_queue FOR SELECT
  USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.decision_queue TO service_role;
GRANT SELECT ON public.decision_queue TO authenticated;
