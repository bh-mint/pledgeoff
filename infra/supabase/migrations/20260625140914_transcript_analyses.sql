CREATE TABLE IF NOT EXISTS public.transcript_analyses (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id               UUID NOT NULL UNIQUE REFERENCES public.ideas(id) ON DELETE CASCADE,
  user_id               UUID NOT NULL REFERENCES auth.users(id),
  confirmed_hypotheses  JSONB NOT NULL DEFAULT '[]',
  rejected_hypotheses   JSONB NOT NULL DEFAULT '[]',
  new_insights          JSONB NOT NULL DEFAULT '[]',
  quotes                JSONB NOT NULL DEFAULT '[]',
  signal_strength       TEXT NOT NULL CHECK (signal_strength IN ('strong', 'moderate', 'weak')),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS transcript_analyses_user_id_idx ON public.transcript_analyses(user_id);
CREATE INDEX IF NOT EXISTS transcript_analyses_created_at_idx ON public.transcript_analyses(created_at DESC);

ALTER TABLE public.transcript_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "transcript_analyses_select_policy" ON public.transcript_analyses
  FOR SELECT USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.transcript_analyses TO service_role;
GRANT SELECT ON public.transcript_analyses TO authenticated;
