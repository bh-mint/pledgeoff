-- M8: Engineering Intelligence Layer — engineering_snapshots table
-- One active snapshot per user (UNIQUE on user_id via upsert)

CREATE TABLE public.engineering_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  github_org TEXT NOT NULL,
  github_access_token_encrypted TEXT NOT NULL, -- AES-256-GCM encrypted; never returned via API
  repo_filter TEXT[],
  velocity_metrics JSONB NOT NULL,
  bottlenecks JSONB NOT NULL DEFAULT '[]',
  snapshot_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT engineering_snapshots_user_unique UNIQUE (user_id)
);

CREATE INDEX engineering_snapshots_user_idx ON public.engineering_snapshots (user_id);

ALTER TABLE public.engineering_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own engineering snapshot"
  ON public.engineering_snapshots
  FOR SELECT
  USING (auth.uid() = user_id);

-- Service role has full access (API routes, cron refresh)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.engineering_snapshots TO service_role;
-- Authenticated can read own row (RLS enforces ownership)
GRANT SELECT ON public.engineering_snapshots TO authenticated;

-- Rollback: DROP TABLE public.engineering_snapshots;
