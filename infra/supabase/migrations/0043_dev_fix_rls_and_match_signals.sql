-- DEV ONLY: Fix RLS initplan on decision_signals + search_path on match_signals.
-- Applied only on dev (prod had 0037/0038 applied correctly via MCP with these fixes included).

-- Fix 1: decision_signals RLS policy — replace auth.uid() with (select auth.uid()) to avoid
-- per-row re-evaluation
DROP POLICY IF EXISTS "users_select_decision_signals_for_own_decisions" ON public.decision_signals;

CREATE POLICY "users_select_decision_signals_for_own_decisions"
  ON public.decision_signals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.decisions d
      JOIN public.ideas i ON i.id = d.idea_id
      WHERE d.id = public.decision_signals.decision_id
        AND i.user_id = (SELECT auth.uid())
    )
  );

-- Fix 2: match_signals — add SET search_path = public
CREATE OR REPLACE FUNCTION public.match_signals(
  query_embedding vector(512),
  match_idea_id   UUID,
  match_count     INT DEFAULT 15
)
RETURNS SETOF public.signals
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.signals
  WHERE idea_id = match_idea_id
  ORDER BY
    CASE WHEN embedding IS NULL THEN 1 ELSE 0 END,
    CASE WHEN embedding IS NOT NULL THEN embedding <=> query_embedding END
  LIMIT match_count;
$$;
