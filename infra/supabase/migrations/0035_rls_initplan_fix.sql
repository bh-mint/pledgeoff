-- Replace auth.uid() with (select auth.uid()) in all RLS policies.
-- This prevents per-row re-evaluation of the auth function (initplan optimization).
-- Also combines the two permissive SELECT policies on teams into one.

-- ideas
DROP POLICY IF EXISTS users_select_own_ideas ON public.ideas;
CREATE POLICY users_select_own_ideas ON public.ideas
  FOR SELECT USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS users_insert_own_ideas ON public.ideas;
CREATE POLICY users_insert_own_ideas ON public.ideas
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- signals
DROP POLICY IF EXISTS users_select_signals_for_own_ideas ON public.signals;
CREATE POLICY users_select_signals_for_own_ideas ON public.signals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.ideas
      WHERE ideas.id = signals.idea_id
        AND ideas.user_id = (select auth.uid())
    )
  );

-- decisions
DROP POLICY IF EXISTS users_select_decisions_for_own_ideas ON public.decisions;
CREATE POLICY users_select_decisions_for_own_ideas ON public.decisions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.ideas
      WHERE ideas.id = decisions.idea_id
        AND ideas.user_id = (select auth.uid())
    )
  );

-- feedback
DROP POLICY IF EXISTS users_select_own_feedback ON public.feedback;
CREATE POLICY users_select_own_feedback ON public.feedback
  FOR SELECT USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS users_insert_own_feedback ON public.feedback;
CREATE POLICY users_insert_own_feedback ON public.feedback
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- profiles
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT USING ((select auth.uid()) = id);

DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE USING ((select auth.uid()) = id);

-- simulations
DROP POLICY IF EXISTS "Users can read own simulations" ON public.simulations;
CREATE POLICY "Users can read own simulations" ON public.simulations
  FOR SELECT USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own simulations" ON public.simulations;
CREATE POLICY "Users can insert own simulations" ON public.simulations
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- landing_pages
DROP POLICY IF EXISTS "users can read own landing pages" ON public.landing_pages;
CREATE POLICY "users can read own landing pages" ON public.landing_pages
  FOR SELECT USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "users can insert own landing pages" ON public.landing_pages;
CREATE POLICY "users can insert own landing pages" ON public.landing_pages
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- customer_analyses
DROP POLICY IF EXISTS "users can read own customer analyses" ON public.customer_analyses;
CREATE POLICY "users can read own customer analyses" ON public.customer_analyses
  FOR SELECT USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "users can insert own customer analyses" ON public.customer_analyses;
CREATE POLICY "users can insert own customer analyses" ON public.customer_analyses
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- build_analyses
DROP POLICY IF EXISTS "users can read own build analyses" ON public.build_analyses;
CREATE POLICY "users can read own build analyses" ON public.build_analyses
  FOR SELECT USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "users can insert own build analyses" ON public.build_analyses;
CREATE POLICY "users can insert own build analyses" ON public.build_analyses
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- competitor_analyses
DROP POLICY IF EXISTS "Users can read own competitor analyses" ON public.competitor_analyses;
CREATE POLICY "Users can read own competitor analyses" ON public.competitor_analyses
  FOR SELECT USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own competitor analyses" ON public.competitor_analyses;
CREATE POLICY "Users can insert own competitor analyses" ON public.competitor_analyses
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- subscriptions
DROP POLICY IF EXISTS users_read_own_subscription ON public.subscriptions;
CREATE POLICY users_read_own_subscription ON public.subscriptions
  FOR SELECT USING ((select auth.uid()) = user_id);

-- teams: combine owner + member into single policy (fixes multiple_permissive_policies warning)
DROP POLICY IF EXISTS owner_read_own_team ON public.teams;
DROP POLICY IF EXISTS member_read_team ON public.teams;
CREATE POLICY team_read_own ON public.teams
  FOR SELECT USING (
    (select auth.uid()) = owner_id
    OR EXISTS (
      SELECT 1 FROM public.team_memberships
      WHERE team_memberships.team_id = teams.id
        AND team_memberships.user_id = (select auth.uid())
        AND team_memberships.status = 'active'
    )
  );

-- team_memberships
DROP POLICY IF EXISTS team_members_read_memberships ON public.team_memberships;
CREATE POLICY team_members_read_memberships ON public.team_memberships
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.teams
      WHERE teams.id = team_memberships.team_id
        AND (
          teams.owner_id = (select auth.uid())
          OR EXISTS (
            SELECT 1 FROM public.team_memberships tm2
            WHERE tm2.team_id = team_memberships.team_id
              AND tm2.user_id = (select auth.uid())
              AND tm2.status = 'active'
          )
        )
    )
  );
