-- Migration: create_idea_with_event
-- Atomic SQL function: inserts idea + outbox event in one transaction.
-- Eliminates the non-atomic save() + eventBus.publish() sequence in CreateIdeaUseCase.

CREATE OR REPLACE FUNCTION public.create_idea_with_event(
  p_idea_id       UUID,
  p_user_id       UUID,
  p_team_id       UUID,
  p_text          TEXT,
  p_niche         TEXT,
  p_created_at    TIMESTAMPTZ,
  p_event_id      UUID,
  p_event_type    TEXT,
  p_event_payload JSONB
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.ideas (id, user_id, team_id, text, niche, created_at)
  VALUES (p_idea_id, p_user_id, p_team_id, p_text, p_niche, p_created_at);

  INSERT INTO public.outbox (event_id, event_type, payload, processed)
  VALUES (p_event_id, p_event_type, p_event_payload, false);
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_idea_with_event TO service_role;
REVOKE EXECUTE ON FUNCTION public.create_idea_with_event FROM PUBLIC;

-- Rollback: DROP FUNCTION IF EXISTS public.create_idea_with_event;
