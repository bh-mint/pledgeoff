-- audit_log was created in 0012 without GRANT to service_role.
-- PostgREST validates GRANTs separately from RLS, so INSERT via service client returned 403.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.audit_log TO service_role;
