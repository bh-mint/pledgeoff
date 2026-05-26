-- Drop the decision_signals M2M table which was created in migration 0037
-- but never written to. The canonical storage for signal references is
-- decisions.signal_ids UUID[], which is written by SupabaseDecisionRepository.
-- Keeping an always-empty table only creates maintenance overhead and
-- misleads future readers into thinking signals are stored there.

DROP TABLE IF EXISTS public.decision_signals CASCADE;
