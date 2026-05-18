-- Tracks which sequence emails have been sent to each user.
-- Unique on (user_id, sequence_day) ensures idempotency — cron can run multiple times safely.

CREATE TABLE public.email_sequences (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sequence_day INT         NOT NULL CHECK (sequence_day IN (3, 7, 14, 21)),
  sent_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, sequence_day)
);

ALTER TABLE public.email_sequences ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON public.email_sequences TO service_role;
