-- Migration: add 'admin' to team_memberships.role CHECK constraint
-- Rollback: see below

ALTER TABLE team_memberships
  DROP CONSTRAINT IF EXISTS team_memberships_role_check;

ALTER TABLE team_memberships
  ADD CONSTRAINT team_memberships_role_check
  CHECK (role IN ('owner', 'admin', 'member'));

-- Rollback:
-- ALTER TABLE team_memberships DROP CONSTRAINT team_memberships_role_check;
-- ALTER TABLE team_memberships ADD CONSTRAINT team_memberships_role_check CHECK (role IN ('owner', 'member'));
