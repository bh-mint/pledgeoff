-- DB hygiene (Pasul 21.4) — fixes for Supabase advisor lints:
-- 1) auth_rls_initplan (27 policies): wrap auth.uid() in a scalar subquery so it
--    is evaluated once per statement instead of once per row.
-- 2) unindexed_foreign_keys (8 FKs): covering indexes.
-- 3) multiple_permissive_policies on team_domain_allowlists: the FOR ALL write
--    policy overlapped the SELECT policy; split into INSERT/UPDATE/DELETE.

-- ── 1) initplan: (select auth.uid()) ────────────────────────────────────────

ALTER POLICY api_keys_insert ON public.api_keys
  WITH CHECK (user_id = (select auth.uid()));
ALTER POLICY api_keys_select ON public.api_keys
  USING (user_id = (select auth.uid()));
ALTER POLICY api_keys_update ON public.api_keys
  USING (user_id = (select auth.uid()));

ALTER POLICY "Users can view their own API request logs" ON public.api_request_log
  USING (user_id = (select auth.uid()));

ALTER POLICY "Users can manage their own battlecards" ON public.battlecards
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

ALTER POLICY competitor_snapshots_select ON public.competitor_snapshots
  USING (idea_id IN (SELECT id FROM public.ideas WHERE user_id = (select auth.uid())));

ALTER POLICY "users insert own outcomes" ON public.decision_outcomes
  WITH CHECK ((select auth.uid()) = user_id);
ALTER POLICY "users read own outcomes" ON public.decision_outcomes
  USING ((select auth.uid()) = user_id);
ALTER POLICY "users update own outcomes" ON public.decision_outcomes
  USING ((select auth.uid()) = user_id);

ALTER POLICY "users read own queue" ON public.decision_queue
  USING ((select auth.uid()) = user_id);

ALTER POLICY "Users can read own decision signals" ON public.decision_signals
  USING (EXISTS (
    SELECT 1
    FROM public.decisions d
    JOIN public.ideas i ON i.id = d.idea_id
    WHERE d.id = decision_signals.decision_id
      AND i.user_id = (select auth.uid())
  ));

ALTER POLICY "users read own engineering snapshot" ON public.engineering_snapshots
  USING ((select auth.uid()) = user_id);

ALTER POLICY "Users can manage their own feature analyses" ON public.feature_analyses
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

ALTER POLICY interview_guides_select_policy ON public.interview_guides
  USING ((select auth.uid()) = user_id);

ALTER POLICY landscape_snapshots_select ON public.landscape_snapshots
  USING (idea_id IN (SELECT id FROM public.ideas WHERE user_id = (select auth.uid())));

ALTER POLICY "users can insert own launch kits" ON public.launch_kits
  WITH CHECK ((select auth.uid()) = user_id);
ALTER POLICY "users can read own launch kits" ON public.launch_kits
  USING ((select auth.uid()) = user_id);

ALTER POLICY users_select_own_market_landscapes ON public.market_landscapes
  USING ((select auth.uid()) = user_id);

ALTER POLICY "users can read own notifications" ON public.notifications
  USING ((select auth.uid()) = user_id);
ALTER POLICY "users can update own notifications" ON public.notifications
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

ALTER POLICY transcript_analyses_select_policy ON public.transcript_analyses
  USING ((select auth.uid()) = user_id);

ALTER POLICY "Users can delete own webhook config" ON public.webhook_configs
  USING ((select auth.uid()) = user_id);
ALTER POLICY "Users can insert own webhook config" ON public.webhook_configs
  WITH CHECK ((select auth.uid()) = user_id);
ALTER POLICY "Users can read own webhook config" ON public.webhook_configs
  USING ((select auth.uid()) = user_id);
ALTER POLICY "Users can update own webhook config" ON public.webhook_configs
  USING ((select auth.uid()) = user_id);

ALTER POLICY "team members can read domain allowlists" ON public.team_domain_allowlists
  USING (
    EXISTS (
      SELECT 1 FROM public.team_memberships tm
      WHERE tm.team_id = team_domain_allowlists.team_id
        AND tm.user_id = (select auth.uid())
        AND tm.status = 'active'
    )
    OR EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id = team_domain_allowlists.team_id
        AND t.owner_id = (select auth.uid())
    )
  );

-- ── 3) team_domain_allowlists: split FOR ALL write policy so SELECT has a
--       single permissive policy (multiple_permissive_policies lint) ─────────

DROP POLICY "team owner and admin can write domain allowlists" ON public.team_domain_allowlists;

CREATE POLICY "team owner and admin can insert domain allowlists"
  ON public.team_domain_allowlists FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id = team_domain_allowlists.team_id
        AND t.owner_id = (select auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.team_memberships tm
      WHERE tm.team_id = team_domain_allowlists.team_id
        AND tm.user_id = (select auth.uid())
        AND tm.role = 'admin'
        AND tm.status = 'active'
    )
  );

CREATE POLICY "team owner and admin can update domain allowlists"
  ON public.team_domain_allowlists FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id = team_domain_allowlists.team_id
        AND t.owner_id = (select auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.team_memberships tm
      WHERE tm.team_id = team_domain_allowlists.team_id
        AND tm.user_id = (select auth.uid())
        AND tm.role = 'admin'
        AND tm.status = 'active'
    )
  );

CREATE POLICY "team owner and admin can delete domain allowlists"
  ON public.team_domain_allowlists FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id = team_domain_allowlists.team_id
        AND t.owner_id = (select auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.team_memberships tm
      WHERE tm.team_id = team_domain_allowlists.team_id
        AND tm.user_id = (select auth.uid())
        AND tm.role = 'admin'
        AND tm.status = 'active'
    )
  );

-- ── 2) unindexed foreign keys ────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_competitor_analyses_user_id       ON public.competitor_analyses (user_id);
CREATE INDEX IF NOT EXISTS idx_decision_queue_idea_id            ON public.decision_queue (idea_id);
CREATE INDEX IF NOT EXISTS idx_feedback_idea_id                  ON public.feedback (idea_id);
CREATE INDEX IF NOT EXISTS idx_feedback_user_id                  ON public.feedback (user_id);
CREATE INDEX IF NOT EXISTS idx_launch_kits_user_id               ON public.launch_kits (user_id);
CREATE INDEX IF NOT EXISTS idx_market_landscapes_user_id         ON public.market_landscapes (user_id);
CREATE INDEX IF NOT EXISTS idx_team_domain_allowlists_created_by ON public.team_domain_allowlists (created_by);
CREATE INDEX IF NOT EXISTS idx_team_invite_links_created_by      ON public.team_invite_links (created_by);
