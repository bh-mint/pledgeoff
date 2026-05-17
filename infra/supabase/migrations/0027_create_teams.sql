-- Migration 0027: teams + team_memberships for multi-seat plans

CREATE TABLE IF NOT EXISTS teams (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  owner_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (owner_id)
);

CREATE TABLE IF NOT EXISTS team_memberships (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id        UUID        NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id        UUID        REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_email  TEXT        NOT NULL,
  role           TEXT        NOT NULL DEFAULT 'member'
                   CHECK (role IN ('owner', 'member')),
  status         TEXT        NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'active')),
  invite_token   UUID        NOT NULL DEFAULT gen_random_uuid(),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (team_id, invited_email),
  UNIQUE (invite_token)
);

CREATE INDEX IF NOT EXISTS idx_team_memberships_team_id   ON team_memberships (team_id);
CREATE INDEX IF NOT EXISTS idx_team_memberships_user_id   ON team_memberships (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_team_memberships_token     ON team_memberships (invite_token);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_teams_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_teams_updated_at
  BEFORE UPDATE ON teams
  FOR EACH ROW EXECUTE FUNCTION update_teams_updated_at();

CREATE OR REPLACE FUNCTION update_team_memberships_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_team_memberships_updated_at
  BEFORE UPDATE ON team_memberships
  FOR EACH ROW EXECUTE FUNCTION update_team_memberships_updated_at();

-- RLS
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_memberships ENABLE ROW LEVEL SECURITY;

-- Owner sees their own team
CREATE POLICY "owner_read_own_team"
  ON teams FOR SELECT
  USING (auth.uid() = owner_id);

-- Members see the team they belong to
CREATE POLICY "member_read_team"
  ON teams FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_memberships
      WHERE team_id = teams.id
        AND user_id = auth.uid()
        AND status = 'active'
    )
  );

-- Owner and active members see memberships for their team
CREATE POLICY "team_members_read_memberships"
  ON team_memberships FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM teams
      WHERE id = team_memberships.team_id
        AND (
          owner_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM team_memberships tm2
            WHERE tm2.team_id = team_memberships.team_id
              AND tm2.user_id = auth.uid()
              AND tm2.status = 'active'
          )
        )
    )
  );

-- Service role bypasses RLS for all writes
