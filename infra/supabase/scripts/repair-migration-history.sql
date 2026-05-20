-- ============================================================
-- REPAIR MIGRATION HISTORY
-- Generated: 2026-05-20
--
-- Context: schema_migrations contained timestamp-format versions
-- (from MCP apply_migration) incompatible with local numeric files.
-- This script re-establishes the correct numeric versions.
--
-- IMPORTANT: This file ONLY touches supabase_migrations.schema_migrations.
-- It does NOT modify any application schema or data.
--
-- Run on DEV first, verify with dry-run, then run on PROD.
-- ============================================================


-- ============================================================
-- STEP 1: DEV (project: vayqlprmwtvwqfxdfygl)
-- Run via MCP supabase-dev-write
-- All 45 migrations (0001-0046, no 0010) are already applied on dev.
-- ============================================================

TRUNCATE supabase_migrations.schema_migrations;

INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES
  ('0001', 'create_ideas'),
  ('0002', 'create_signals'),
  ('0003', 'create_decisions'),
  ('0004', 'create_feedback'),
  ('0005', 'create_processed_events'),
  ('0006', 'grant_table_permissions'),
  ('0007', 'create_waitlist'),
  ('0008', 'extend_auth_profiles'),
  ('0009', 'create_outbox'),
  -- 0010 intentionally skipped (file does not exist)
  ('0011', 'add_dimensions_to_decisions'),
  ('0012', 'create_audit_log'),
  ('0013', 'welcome_email_trigger'),
  ('0014', 'create_simulations'),
  ('0015', 'create_landing_pages'),
  ('0016', 'create_customer_analyses'),
  ('0017', 'create_build_analyses'),
  ('0018', 'add_feedback_comment'),
  ('0019', 'add_hn_signal_source'),
  ('0020', 'add_producthunt_google_signal_sources'),
  ('0021', 'add_devto_signal_source'),
  ('0022', 'add_brave_signal_source'),
  ('0023', 'create_competitor_analyses'),
  ('0024', 'create_subscriptions'),
  ('0025', 'add_company_name_to_profiles'),
  ('0026', 'split_profile_name_fields'),
  ('0027', 'create_teams'),
  ('0028', 'team_memberships_audit'),
  ('0029', 'team_tables_grant_fix'),
  ('0030', 'subscriptions_extra_seats'),
  ('0031', 'ideas_team_id'),
  ('0032', 'idea_reactions'),
  ('0033', 'email_sequences'),
  ('0034', 'security_fix_functions'),
  ('0035', 'rls_initplan_fix'),
  ('0036', 'subscription_past_due_since'),
  ('0037', 'decision_signals'),
  ('0038', 'pgvector_signal_embeddings'),
  ('0039', 'otto_conversations'),
  ('0040', 'subscriptions_otto_balance'),
  ('0041', 'fix_welcome_email_trigger_url'),
  ('0042', 'revoke_security_definer_from_public'),
  ('0043', 'dev_fix_rls_and_match_signals'),
  ('0044', 'dev_move_vector_to_extensions_schema'),
  ('0045', 'add_niche_to_ideas'),
  ('0046', 'add_agency_plan');
-- Expected: 45 rows

-- Verify after running:
-- SELECT count(*) FROM supabase_migrations.schema_migrations; -- 45
-- SELECT version FROM supabase_migrations.schema_migrations ORDER BY version::int;


-- ============================================================
-- STEP 2: PROD (project: gphupxlfmeokquvyxqfw)
-- Run via MCP supabase-prod-write
--
-- Applied on prod: 0001-0042 (41 files, no 0010)
-- Pending on prod: 0043 (RLS fix), 0045 (niche), 0046 (agency plan)
-- Dev-only skip:   0044 (vector extension schema — do NOT run on prod,
--                  but mark as applied so db push skips it)
-- ============================================================

TRUNCATE supabase_migrations.schema_migrations;

INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES
  ('0001', 'create_ideas'),
  ('0002', 'create_signals'),
  ('0003', 'create_decisions'),
  ('0004', 'create_feedback'),
  ('0005', 'create_processed_events'),
  ('0006', 'grant_table_permissions'),
  ('0007', 'create_waitlist'),
  ('0008', 'extend_auth_profiles'),
  ('0009', 'create_outbox'),
  -- 0010 intentionally skipped (file does not exist)
  ('0011', 'add_dimensions_to_decisions'),
  ('0012', 'create_audit_log'),
  ('0013', 'welcome_email_trigger'),
  ('0014', 'create_simulations'),
  ('0015', 'create_landing_pages'),
  ('0016', 'create_customer_analyses'),
  ('0017', 'create_build_analyses'),
  ('0018', 'add_feedback_comment'),
  ('0019', 'add_hn_signal_source'),
  ('0020', 'add_producthunt_google_signal_sources'),
  ('0021', 'add_devto_signal_source'),
  ('0022', 'add_brave_signal_source'),
  ('0023', 'create_competitor_analyses'),
  ('0024', 'create_subscriptions'),
  ('0025', 'add_company_name_to_profiles'),
  ('0026', 'split_profile_name_fields'),
  ('0027', 'create_teams'),
  ('0028', 'team_memberships_audit'),
  ('0029', 'team_tables_grant_fix'),
  ('0030', 'subscriptions_extra_seats'),
  ('0031', 'ideas_team_id'),
  ('0032', 'idea_reactions'),
  ('0033', 'email_sequences'),
  ('0034', 'security_fix_functions'),
  ('0035', 'rls_initplan_fix'),
  ('0036', 'subscription_past_due_since'),
  ('0037', 'decision_signals'),
  ('0038', 'pgvector_signal_embeddings'),
  ('0039', 'otto_conversations'),
  ('0040', 'subscriptions_otto_balance'),
  ('0041', 'fix_welcome_email_trigger_url'),
  ('0042', 'revoke_security_definer_from_public'),
  ('0044', 'dev_move_vector_to_extensions_schema'); -- marked applied, NOT run on prod
-- Expected: 42 rows
-- Pending after this: 0043, 0045, 0046 → applied via `supabase db push --linked`

-- Verify after running:
-- SELECT count(*) FROM supabase_migrations.schema_migrations; -- 42
-- SELECT version FROM supabase_migrations.schema_migrations ORDER BY version::int;
