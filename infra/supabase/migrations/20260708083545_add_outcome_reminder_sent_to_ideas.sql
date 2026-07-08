-- 8.3: outcome reminder email at 30 days after verdict.
-- Dedup marker: one reminder per idea, set only after Resend accepts the email.
ALTER TABLE public.ideas
  ADD COLUMN IF NOT EXISTS outcome_reminder_sent_at TIMESTAMPTZ;
