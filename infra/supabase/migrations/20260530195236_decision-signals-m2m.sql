-- M2M table: decision ↔ signal
-- Enables efficient signal→decisions queries for analytics
-- signal_ids UUID[] on decisions remains source of truth; this table is derived from it.

CREATE TABLE public.decision_signals (
  decision_id UUID NOT NULL REFERENCES public.decisions(id) ON DELETE CASCADE,
  signal_id   UUID NOT NULL REFERENCES public.signals(id)   ON DELETE CASCADE,
  PRIMARY KEY (decision_id, signal_id)
);

-- Index for the signal → decisions direction (the whole point of this table)
CREATE INDEX decision_signals_signal_id_idx ON public.decision_signals (signal_id);

GRANT SELECT, INSERT, DELETE ON public.decision_signals TO service_role;
GRANT SELECT ON public.decision_signals TO authenticated;

ALTER TABLE public.decision_signals ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read decision_signals for ideas they own
CREATE POLICY "Users can read own decision signals"
  ON public.decision_signals
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.decisions d
      JOIN public.ideas i ON i.id = d.idea_id
      WHERE d.id = decision_id
        AND i.user_id = auth.uid()
    )
  );

-- Backfill from signal_ids[] — only pairs where both rows actually exist
INSERT INTO public.decision_signals (decision_id, signal_id)
SELECT d.id, s.id
FROM public.decisions d
JOIN public.signals s ON s.id = ANY(d.signal_ids)
WHERE array_length(d.signal_ids, 1) > 0
ON CONFLICT DO NOTHING;
