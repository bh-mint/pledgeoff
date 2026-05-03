-- Outbox table for durable event delivery (P3 Ingestion)
-- Events are inserted here on publish and marked processed after successful dispatch.
-- Vercel Cron retries unprocessed events.

CREATE TABLE IF NOT EXISTS outbox (
  event_id     UUID PRIMARY KEY,
  event_type   TEXT NOT NULL,
  payload      JSONB NOT NULL,
  processed    BOOLEAN NOT NULL DEFAULT FALSE,
  attempts     INT NOT NULL DEFAULT 0,
  last_error   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_outbox_unprocessed
  ON outbox (created_at)
  WHERE processed = FALSE;

-- RLS: outbox is internal-only (service role only; no user access)
ALTER TABLE outbox ENABLE ROW LEVEL SECURITY;

-- No user-facing policies: service role bypasses RLS by default
-- Grant access to service role explicitly
GRANT SELECT, INSERT, UPDATE ON outbox TO service_role;
GRANT SELECT, INSERT, UPDATE ON outbox TO postgres;
