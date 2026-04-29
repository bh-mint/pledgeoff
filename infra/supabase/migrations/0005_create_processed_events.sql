-- Idempotency store for the event bus consumer
-- Service role only — no RLS needed
CREATE TABLE processed_events (
  event_id     UUID        PRIMARY KEY,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
