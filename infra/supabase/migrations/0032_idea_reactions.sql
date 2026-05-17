CREATE TABLE IF NOT EXISTS public.idea_reactions (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id    UUID        NOT NULL REFERENCES public.ideas(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction   TEXT        NOT NULL CHECK (reaction IN ('agree', 'disagree')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (idea_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_idea_reactions_idea_id ON public.idea_reactions (idea_id);
CREATE INDEX IF NOT EXISTS idx_idea_reactions_user_id ON public.idea_reactions (user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.idea_reactions TO service_role;
GRANT SELECT ON public.idea_reactions TO authenticated;
