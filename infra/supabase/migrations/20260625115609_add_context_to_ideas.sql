-- Migration: add_context_to_ideas
-- Adds optional founder context field to ideas table and updates the atomic RPC function.

ALTER TABLE public.ideas ADD COLUMN IF NOT EXISTS context text;

-- Drop old overload (9 params, without p_context) if it exists
DROP FUNCTION IF EXISTS public.create_idea_with_event(UUID, UUID, UUID, TEXT, TEXT, TIMESTAMPTZ, UUID, TEXT, JSONB);

-- Recreate create_idea_with_event to accept p_context (10 params)
CREATE OR REPLACE FUNCTION public.create_idea_with_event(
  p_idea_id       UUID,
  p_user_id       UUID,
  p_team_id       UUID,
  p_text          TEXT,
  p_niche         TEXT,
  p_created_at    TIMESTAMPTZ,
  p_event_id      UUID,
  p_event_type    TEXT,
  p_event_payload JSONB,
  p_context       TEXT DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.ideas (id, user_id, team_id, text, niche, created_at, context)
  VALUES (p_idea_id, p_user_id, p_team_id, p_text, p_niche, p_created_at, p_context);

  INSERT INTO public.outbox (event_id, event_type, payload, processed)
  VALUES (p_event_id, p_event_type, p_event_payload, false);
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_idea_with_event(UUID, UUID, UUID, TEXT, TEXT, TIMESTAMPTZ, UUID, TEXT, JSONB, TEXT) TO service_role;
REVOKE EXECUTE ON FUNCTION public.create_idea_with_event(UUID, UUID, UUID, TEXT, TEXT, TIMESTAMPTZ, UUID, TEXT, JSONB, TEXT) FROM PUBLIC;

-- Rollback:
-- ALTER TABLE public.ideas DROP COLUMN IF EXISTS context;
-- (restore previous create_idea_with_event without p_context)
