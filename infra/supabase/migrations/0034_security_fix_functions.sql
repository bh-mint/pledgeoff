-- Fix 1: add search_path to trigger functions (prevents search_path injection)
ALTER FUNCTION public.update_subscriptions_updated_at() SET search_path = public;
ALTER FUNCTION public.update_teams_updated_at() SET search_path = public;
ALTER FUNCTION public.update_team_memberships_updated_at() SET search_path = public;

-- Fix 2: revoke public execute on SECURITY DEFINER functions
-- handle_new_user is called only by auth trigger, not by anon users
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;

-- rls_auto_enable is an event trigger function, never callable by users
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM authenticated;
