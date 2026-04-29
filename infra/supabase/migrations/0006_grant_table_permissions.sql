-- Grant table-level permissions to Supabase roles
-- (Supabase does not auto-grant when migrations are applied via API)
GRANT ALL ON ideas TO service_role;
GRANT SELECT, INSERT ON ideas TO authenticated;

GRANT ALL ON signals TO service_role;
GRANT SELECT ON signals TO authenticated;

GRANT ALL ON decisions TO service_role;
GRANT SELECT ON decisions TO authenticated;

GRANT ALL ON feedback TO service_role;
GRANT SELECT, INSERT ON feedback TO authenticated;

GRANT ALL ON processed_events TO service_role;
