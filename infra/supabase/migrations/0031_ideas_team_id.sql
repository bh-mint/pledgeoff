-- Foundation for team-context validations.
-- team_id is nullable: NULL = personal idea, set = team idea (future contextual creation).
ALTER TABLE public.ideas
  ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ideas_team_id ON public.ideas (team_id);

GRANT SELECT, INSERT, UPDATE ON public.ideas TO service_role;
GRANT SELECT ON public.ideas TO authenticated;
