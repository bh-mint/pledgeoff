-- Add past_due_since to track when a subscription first went past_due.
-- Used by the billing cron to send payment-failed emails and retry/downgrade after 24h.

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS past_due_since TIMESTAMPTZ NULL;

GRANT SELECT, INSERT, UPDATE ON public.subscriptions TO service_role, authenticated;
