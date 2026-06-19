-- Fix: infinite recursion in ideas_select_policy via team_memberships RLS
--
-- Root cause: ideas_select_policy (FEAT-TEAM) queries team_memberships;
-- team_memberships has policy "team_members_read_memberships" that
-- self-references team_memberships (via tm2 alias) → infinite recursion.
--
-- Fix: SECURITY DEFINER function bypasses RLS when querying team_memberships,
-- breaking the recursion cycle.

CREATE OR REPLACE FUNCTION public.user_has_team_access_to_idea(
  p_idea_id uuid,
  p_user_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.ideas i
    WHERE i.id = p_idea_id
      AND i.team_id IS NOT NULL
      AND (
        EXISTS (
          SELECT 1 FROM public.teams t
          WHERE t.id = i.team_id AND t.owner_id = p_user_id
        )
        OR EXISTS (
          SELECT 1 FROM public.team_memberships tm
          WHERE tm.team_id = i.team_id
            AND tm.user_id = p_user_id
            AND tm.status = 'active'
        )
      )
  )
$$;

REVOKE ALL ON FUNCTION public.user_has_team_access_to_idea(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_has_team_access_to_idea(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_team_access_to_idea(uuid, uuid) TO service_role;

-- Recreate ideas_select_policy using the SECURITY DEFINER function
DROP POLICY IF EXISTS ideas_select_policy ON public.ideas;
CREATE POLICY ideas_select_policy ON public.ideas
  FOR SELECT USING (
    (select auth.uid()) = user_id
    OR public.user_has_team_access_to_idea(id, (select auth.uid()))
  );
