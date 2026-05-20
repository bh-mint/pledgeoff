-- Revoke EXECUTE from PUBLIC role on all SECURITY DEFINER functions.
-- Prior migration (0034) only revoked from anon/authenticated — PUBLIC grant remained active
-- and implicitly covers both roles. Applied on dev + prod.

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.match_signals(vector, uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.match_signals(vector, uuid, integer) TO service_role;

-- prod-only: notify_welcome_email (doesn't exist on dev)
-- REVOKE EXECUTE ON FUNCTION public.notify_welcome_email() FROM PUBLIC;
