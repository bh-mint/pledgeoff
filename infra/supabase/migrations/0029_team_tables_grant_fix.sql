-- Migration 0029: GRANT fix for teams + team_memberships
-- service_role lacked SELECT/INSERT/UPDATE/DELETE — PostgREST returned 500
-- Per CLAUDE.md §9: CREATE TABLE without GRANT = 403/500 guaranteed

GRANT SELECT, INSERT, UPDATE, DELETE ON public.teams TO service_role;
GRANT SELECT ON public.teams TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_memberships TO service_role;
GRANT SELECT ON public.team_memberships TO authenticated;
