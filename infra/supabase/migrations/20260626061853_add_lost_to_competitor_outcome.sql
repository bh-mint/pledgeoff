-- Pasul 19.1: Win/Loss competitor attribution
-- Adds optional field to record which competitor caused a loss when outcome = 'built_failed'

ALTER TABLE public.decision_outcomes
  ADD COLUMN IF NOT EXISTS lost_to_competitor TEXT;

-- Rollback: ALTER TABLE public.decision_outcomes DROP COLUMN IF EXISTS lost_to_competitor;
