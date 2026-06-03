ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS verifications_purchased INT NOT NULL DEFAULT 0;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscriptions TO service_role;
GRANT SELECT ON public.subscriptions TO authenticated;
