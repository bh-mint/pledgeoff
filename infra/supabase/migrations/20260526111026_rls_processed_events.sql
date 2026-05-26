-- DB-4: processed_events had no RLS — any authenticated user could insert
-- arbitrary event IDs and poison the idempotency pipeline silently.
-- Service role bypasses RLS so the event bus continues to work normally.
ALTER TABLE processed_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deny_all_authenticated_processed_events"
  ON processed_events
  FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);

-- ROLLBACK:
-- DROP POLICY IF EXISTS "deny_all_authenticated_processed_events" ON processed_events;
-- ALTER TABLE processed_events DISABLE ROW LEVEL SECURITY;
