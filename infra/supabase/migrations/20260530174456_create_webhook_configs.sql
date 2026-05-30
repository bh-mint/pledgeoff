-- webhook_configs: one row per user, stores endpoint URL + hashed HMAC secret
CREATE TABLE IF NOT EXISTS public.webhook_configs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url         TEXT        NOT NULL,
  secret_hash TEXT        NOT NULL,
  active      BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT webhook_configs_user_id_unique UNIQUE (user_id)
);

-- Only the owning user can read/write their webhook config
ALTER TABLE public.webhook_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own webhook config"
  ON public.webhook_configs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own webhook config"
  ON public.webhook_configs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own webhook config"
  ON public.webhook_configs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own webhook config"
  ON public.webhook_configs FOR DELETE
  USING (auth.uid() = user_id);

-- Service role access for server-side delivery (reads url + secret_hash)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.webhook_configs TO service_role;
GRANT SELECT ON public.webhook_configs TO authenticated;

-- Rollback: DROP TABLE IF EXISTS public.webhook_configs;
