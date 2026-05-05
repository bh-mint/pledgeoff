-- CI setup script: creates auth schema stub + roles
-- Run as superuser before applying migrations and adversarial tests.

-- ─────────────────────────────────────────────────────────
-- Roles (if not exists)
-- ─────────────────────────────────────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role BYPASSRLS;
  END IF;
END $$;

-- Allow superuser (postgres) to SET ROLE to these roles
GRANT authenticated TO postgres;
GRANT service_role  TO postgres;

-- ─────────────────────────────────────────────────────────
-- auth schema stub (Supabase auth.uid() replacement)
-- ─────────────────────────────────────────────────────────

CREATE SCHEMA IF NOT EXISTS auth;

-- Minimal auth.users table (only columns referenced by migrations)
CREATE TABLE IF NOT EXISTS auth.users (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmation_sent_at  TIMESTAMPTZ,
  is_super_admin        BOOLEAN DEFAULT false,
  role                  TEXT DEFAULT 'authenticated',
  raw_user_meta_data    JSONB DEFAULT '{}'::jsonb
);

-- auth.uid() reads from a session-local GUC set via SET LOCAL app.current_user_id
CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID AS $$
  SELECT NULLIF(current_setting('app.current_user_id', true), '')::UUID;
$$ LANGUAGE sql STABLE;

-- auth.role() — always returns 'authenticated' in test context (service_role bypasses RLS natively)
CREATE OR REPLACE FUNCTION auth.role() RETURNS TEXT AS $$
  SELECT 'authenticated';
$$ LANGUAGE sql STABLE;

-- Grant usage so authenticated role can execute auth functions
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;
GRANT EXECUTE ON FUNCTION auth.role() TO authenticated;
GRANT USAGE ON SCHEMA auth TO service_role;
