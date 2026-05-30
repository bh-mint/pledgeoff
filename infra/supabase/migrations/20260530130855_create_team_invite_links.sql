-- Team invite links: workspace-level shareable join links
-- One active link per team at a time, valid 30 days, revocable by owner

CREATE TABLE public.team_invite_links (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id     UUID        NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  token       TEXT        NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked_at  TIMESTAMPTZ,
  created_by  UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_team_invite_links_token   ON public.team_invite_links(token);
CREATE INDEX idx_team_invite_links_team_id ON public.team_invite_links(team_id);

ALTER TABLE public.team_invite_links ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_invite_links TO service_role;

-- Rollback: DROP TABLE public.team_invite_links;
