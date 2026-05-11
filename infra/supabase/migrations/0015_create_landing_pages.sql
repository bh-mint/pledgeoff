-- Migration: create landing_pages table
-- P10: Landing Page Generator

CREATE TABLE IF NOT EXISTS landing_pages (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id     UUID        NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  headline    TEXT        NOT NULL,
  subheadline TEXT        NOT NULL,
  features    TEXT[]      NOT NULL DEFAULT '{}',
  cta_text    TEXT        NOT NULL,
  waitlist_headline TEXT  NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS landing_pages_idea_id_idx ON landing_pages(idea_id);
CREATE INDEX IF NOT EXISTS landing_pages_user_id_idx ON landing_pages(user_id);

-- RLS
ALTER TABLE landing_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can read own landing pages"
  ON landing_pages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users can insert own landing pages"
  ON landing_pages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Service role access
GRANT SELECT, INSERT, UPDATE, DELETE ON landing_pages TO service_role;
