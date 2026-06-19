-- FIX-9: admin_override flag on subscriptions
-- When true, Stripe webhooks skip plan updates so the admin-set plan persists.
-- Reset to false to restore Stripe as the authoritative billing source.

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS admin_override BOOLEAN NOT NULL DEFAULT false;
