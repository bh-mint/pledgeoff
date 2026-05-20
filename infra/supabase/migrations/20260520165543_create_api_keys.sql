-- Migration: create_api_keys
-- API keys for programmatic access (Pro+ and Agency plans only)
-- Keys are stored as SHA-256 hashes; plaintext is shown once at creation time.

CREATE TABLE IF NOT EXISTS public.api_keys (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 64),
  key_hash      TEXT NOT NULL UNIQUE,   -- SHA-256 hex of the plaintext key
  key_prefix    TEXT NOT NULL,          -- first 12 chars, shown in UI (e.g. po_live_xxxx)
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at  TIMESTAMPTZ,
  revoked_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS api_keys_user_id_idx ON public.api_keys (user_id);
CREATE INDEX IF NOT EXISTS api_keys_key_hash_idx ON public.api_keys (key_hash);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "api_keys_select" ON public.api_keys
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "api_keys_insert" ON public.api_keys
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "api_keys_update" ON public.api_keys
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.api_keys TO service_role;
GRANT SELECT ON public.api_keys TO authenticated;

-- Rollback: DROP TABLE IF EXISTS public.api_keys;
