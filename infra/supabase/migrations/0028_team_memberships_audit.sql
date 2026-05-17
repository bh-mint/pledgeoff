-- Migration 0028: audit trail for team_memberships
-- Adds invited_at, accepted_at, left_at, removed_by, removal_reason
-- Soft-delete: status now includes 'removed' | 'left'

-- 1. Extend status check constraint
ALTER TABLE public.team_memberships DROP CONSTRAINT IF EXISTS team_memberships_status_check;
ALTER TABLE public.team_memberships
  ADD CONSTRAINT team_memberships_status_check
  CHECK (status IN ('pending', 'active', 'removed', 'left'));

-- 2. Add audit columns
ALTER TABLE public.team_memberships
  ADD COLUMN IF NOT EXISTS invited_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS accepted_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS left_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS removed_by     UUID,
  ADD COLUMN IF NOT EXISTS removal_reason TEXT;

ALTER TABLE public.team_memberships
  ADD CONSTRAINT team_memberships_removal_reason_check
  CHECK (removal_reason IN ('left', 'removed_by_owner'));

-- 3. Backfill invited_at from created_at for existing rows
UPDATE public.team_memberships SET invited_at = created_at;
