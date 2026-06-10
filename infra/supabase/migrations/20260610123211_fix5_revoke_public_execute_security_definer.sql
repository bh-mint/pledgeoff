-- FIX-5 (security P0): revoke the default PUBLIC EXECUTE grant on SECURITY DEFINER functions.
--
-- Root cause: Postgres grants EXECUTE to PUBLIC by default when a function is created.
-- These functions were granted to service_role explicitly but the implicit PUBLIC grant
-- was never revoked, so the `anon` (unauthenticated) and `authenticated` roles could call
-- them directly via PostgREST `/rest/v1/rpc/<fn>` — exposing AI cost analytics + top users
-- to the open internet, and letting any signed-in user invoke the otto/match RPCs directly.
--
-- Fix: REVOKE EXECUTE FROM PUBLIC on each function. service_role keeps its explicit grant,
-- so the admin dashboard (createSupabaseServiceClient) and the pipeline keep working.
--
-- Verify after apply: get_advisors(security) should no longer list these functions.

-- Admin AI cost/usage analytics (admin/ai-cost page; service_role only)
REVOKE EXECUTE ON FUNCTION public.admin_ai_usage_by_feature(timestamptz) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_ai_usage_daily(timestamptz) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_ai_top_users(timestamptz, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_ai_usage_total(timestamptz) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_ai_usage_total_all() FROM PUBLIC;

-- Pipeline RPCs (called only by service_role via the container repositories)
REVOKE EXECUTE ON FUNCTION public.deduct_otto_question(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.match_signals(public.vector, uuid, integer) FROM PUBLIC;
-- match_signals also had an explicit `authenticated` grant (migration 0038) that 0042 never
-- revoked. It is called only via service_role, so revoke it too (FIX-5b on prod).
REVOKE EXECUTE ON FUNCTION public.match_signals(public.vector, uuid, integer) FROM authenticated;

-- Rollback (NOT recommended — reopens the exposure):
--   GRANT EXECUTE ON FUNCTION public.admin_ai_usage_by_feature(timestamptz) TO PUBLIC;  -- etc.
