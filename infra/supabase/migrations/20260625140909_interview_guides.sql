CREATE TABLE IF NOT EXISTS public.interview_guides (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id     UUID NOT NULL UNIQUE REFERENCES public.ideas(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id),
  target_segment TEXT NOT NULL,
  questions   JSONB NOT NULL DEFAULT '[]',
  hypotheses  JSONB NOT NULL DEFAULT '[]',
  red_flags   JSONB NOT NULL DEFAULT '[]',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS interview_guides_user_id_idx ON public.interview_guides(user_id);
CREATE INDEX IF NOT EXISTS interview_guides_created_at_idx ON public.interview_guides(created_at DESC);

ALTER TABLE public.interview_guides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "interview_guides_select_policy" ON public.interview_guides
  FOR SELECT USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.interview_guides TO service_role;
GRANT SELECT ON public.interview_guides TO authenticated;
