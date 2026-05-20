-- Migration: create_feature_flags
-- Feature flags: toggle features globally or per specific user IDs (admin-only)

CREATE TABLE IF NOT EXISTS public.feature_flags (
  id                UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  key               TEXT    NOT NULL UNIQUE CHECK (key ~ '^[a-z0-9_]+$'),
  description       TEXT    NOT NULL DEFAULT '',
  enabled_globally  BOOLEAN NOT NULL DEFAULT false,
  enabled_user_ids  UUID[]  NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

-- Only service_role can read/write feature_flags (admin panel uses service role)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.feature_flags TO service_role;

-- Rollback: DROP TABLE IF EXISTS public.feature_flags;
