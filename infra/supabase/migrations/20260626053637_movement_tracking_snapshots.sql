-- competitor_snapshots: stores previous CompetitorAnalysis before each re-run
CREATE TABLE public.competitor_snapshots (
  id          uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  idea_id     uuid        NOT NULL REFERENCES public.ideas(id) ON DELETE CASCADE,
  data        jsonb       NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX competitor_snapshots_idea_id_idx ON public.competitor_snapshots(idea_id, created_at DESC);

GRANT SELECT, INSERT, DELETE ON public.competitor_snapshots TO service_role;
GRANT SELECT ON public.competitor_snapshots TO authenticated;

ALTER TABLE public.competitor_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY competitor_snapshots_select ON public.competitor_snapshots
  FOR SELECT TO authenticated
  USING (idea_id IN (SELECT id FROM public.ideas WHERE user_id = auth.uid()));

-- landscape_snapshots: stores previous MarketLandscape before each re-run
CREATE TABLE public.landscape_snapshots (
  id          uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  idea_id     uuid        NOT NULL REFERENCES public.ideas(id) ON DELETE CASCADE,
  data        jsonb       NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX landscape_snapshots_idea_id_idx ON public.landscape_snapshots(idea_id, created_at DESC);

GRANT SELECT, INSERT, DELETE ON public.landscape_snapshots TO service_role;
GRANT SELECT ON public.landscape_snapshots TO authenticated;

ALTER TABLE public.landscape_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY landscape_snapshots_select ON public.landscape_snapshots
  FOR SELECT TO authenticated
  USING (idea_id IN (SELECT id FROM public.ideas WHERE user_id = auth.uid()));

-- last_competitor_check: used by cron to find ideas that need re-checking
ALTER TABLE public.ideas ADD COLUMN IF NOT EXISTS last_competitor_check timestamptz;
