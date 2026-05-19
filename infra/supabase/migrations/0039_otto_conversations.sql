-- Migration: 0039_otto_conversations
-- Stores Otto AI conversation history per user per idea

CREATE TABLE public.otto_conversations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  idea_id       UUID NOT NULL REFERENCES public.ideas(id) ON DELETE CASCADE,
  messages      JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, idea_id)
);

CREATE INDEX idx_otto_conversations_user_id ON public.otto_conversations(user_id);
CREATE INDEX idx_otto_conversations_idea_id ON public.otto_conversations(idea_id);

ALTER TABLE public.otto_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own otto conversations"
  ON public.otto_conversations
  FOR ALL
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.otto_conversations TO service_role;
GRANT SELECT ON public.otto_conversations TO authenticated;
