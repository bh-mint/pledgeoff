-- FIX-1b: Parametrize the included Otto limit — eliminate dual source of truth.
-- Caller (TypeScript PLAN_LIMITS) now owns the limit; SQL trusts it.
-- Old single-arg deduct_otto_question(UUID) is dropped after this migration.
--
-- Expand/contract: new 2-arg function created first, old 1-arg dropped last.
-- Code is updated atomically with this migration (same deploy).

CREATE OR REPLACE FUNCTION public.deduct_otto_question(p_user_id UUID, p_included_limit INT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_included_used  INT;
  v_purchased      INT;
BEGIN
  SELECT otto_included_used, otto_purchased
  INTO v_included_used, v_purchased
  FROM public.subscriptions
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN 'not_found';
  END IF;

  IF v_included_used < p_included_limit THEN
    UPDATE public.subscriptions
    SET otto_included_used = otto_included_used + 1,
        updated_at         = NOW()
    WHERE user_id = p_user_id;

  ELSIF v_purchased > 0 THEN
    UPDATE public.subscriptions
    SET otto_purchased = otto_purchased - 1,
        updated_at     = NOW()
    WHERE user_id = p_user_id;

  ELSE
    RETURN 'no_balance';
  END IF;

  RETURN 'ok';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.deduct_otto_question(UUID, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.deduct_otto_question(UUID, INT) TO service_role;

-- Drop old hardcoded single-arg version.
DROP FUNCTION IF EXISTS public.deduct_otto_question(UUID);
