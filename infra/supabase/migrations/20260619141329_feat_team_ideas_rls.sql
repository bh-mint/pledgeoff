-- FEAT-TEAM: extend ideas SELECT policy to include team members
-- Replaces users_select_own_ideas (owner-only) with a combined policy:
-- owner OR active member/owner of the team that owns the idea.
-- Cascades to signals and decisions via EXISTS on ideas.

-- ideas: combined owner + team access
DROP POLICY IF EXISTS users_select_own_ideas ON public.ideas;
CREATE POLICY ideas_select_policy ON public.ideas
  FOR SELECT USING (
    (select auth.uid()) = user_id
    OR (
      team_id IS NOT NULL
      AND (
        EXISTS (
          SELECT 1 FROM public.teams
          WHERE teams.id = ideas.team_id
            AND teams.owner_id = (select auth.uid())
        )
        OR EXISTS (
          SELECT 1 FROM public.team_memberships
          WHERE team_memberships.team_id = ideas.team_id
            AND team_memberships.user_id = (select auth.uid())
            AND team_memberships.status = 'active'
        )
      )
    )
  );

-- signals: cascade through ideas RLS (no explicit user check needed)
DROP POLICY IF EXISTS users_select_signals_for_own_ideas ON public.signals;
CREATE POLICY users_select_signals_for_own_ideas ON public.signals
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.ideas WHERE ideas.id = signals.idea_id)
  );

-- decisions: cascade through ideas RLS
DROP POLICY IF EXISTS users_select_decisions_for_own_ideas ON public.decisions;
CREATE POLICY users_select_decisions_for_own_ideas ON public.decisions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.ideas WHERE ideas.id = decisions.idea_id)
  );
