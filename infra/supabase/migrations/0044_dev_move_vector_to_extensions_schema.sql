-- DEV ONLY: Move vector extension from public schema to extensions schema.
-- Supabase recommends extensions schema to avoid exposing extension objects via PostgREST API.
-- Applied only on dev (prod doesn't have vector installed yet in public schema).

ALTER EXTENSION vector SET SCHEMA extensions;
