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
-- Schema-agnostic: resolves each function via pg_proc by name, so it works whether the
-- `vector` type lives in `public` (prod) or `extensions` (dev, migration 0044). match_signals
-- is matched by name regardless of its argument type schema.
--
-- Verify after apply: get_advisors(security) should no longer list these functions.

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'admin_ai_usage_by_feature',
        'admin_ai_usage_daily',
        'admin_ai_top_users',
        'admin_ai_usage_total',
        'admin_ai_usage_total_all',
        'deduct_otto_question',
        'match_signals'
      )
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', r.sig);
  END LOOP;

  -- match_signals also had an explicit `authenticated` grant (migration 0038) that 0042
  -- never revoked. It is called only via service_role, so revoke that too.
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'match_signals'
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM authenticated', r.sig);
  END LOOP;
END $$;

-- Rollback (NOT recommended — reopens the exposure):
--   GRANT EXECUTE ON FUNCTION public.admin_ai_usage_by_feature(timestamptz) TO PUBLIC;  -- etc.
