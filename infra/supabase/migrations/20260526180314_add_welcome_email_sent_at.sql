-- Add welcome_email_sent_at to profiles for observability.
-- Allows post-facto detection of duplicate sends and delivery auditing.
-- Rollback: ALTER TABLE public.profiles DROP COLUMN welcome_email_sent_at;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS welcome_email_sent_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN public.profiles.welcome_email_sent_at IS
  'Timestamp when the welcome email was dispatched. NULL = not yet sent. Set by new-user webhook after idempotency check passes.';
