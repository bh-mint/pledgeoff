-- Add GDPR Art. 6(1)(a) marketing email consent fields to profiles.
-- consent = false by default (opt-in only, never pre-checked).
-- consented_at is set to NOW() on opt-in, cleared to NULL on opt-out.
-- Rollback: ALTER TABLE public.profiles DROP COLUMN IF EXISTS marketing_emails_consent, DROP COLUMN IF EXISTS marketing_emails_consented_at;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS marketing_emails_consent      BOOLEAN     NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS marketing_emails_consented_at TIMESTAMPTZ;
