-- Atomic Otto question deduction to prevent race conditions.
-- Replaces the SELECT-then-UPDATE pattern in the adapter with a single
-- locked SELECT + conditional UPDATE that holds a row-level lock for the
-- duration of the transaction.
--
-- Returns:
--   'ok'         — deduction succeeded
--   'no_balance' — user has no questions remaining
--   'not_found'  — subscription row missing

CREATE OR REPLACE FUNCTION public.deduct_otto_question(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan           TEXT;
  v_included_limit INT;
  v_included_used  INT;
  v_purchased      INT;
  v_rows_updated   INT;
BEGIN
  -- Lock the subscription row for the duration of this transaction.
  SELECT plan, otto_included_used, otto_purchased
  INTO v_plan, v_included_used, v_purchased
  FROM public.subscriptions
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN 'not_found';
  END IF;

  -- Determine the included limit for this plan.
  v_included_limit := CASE v_plan
    WHEN 'founder'    THEN 5
    WHEN 'team'       THEN 15
    WHEN 'studio'     THEN 50
    WHEN 'enterprise' THEN 2147483647
    ELSE 0
  END;

  IF v_included_used < v_included_limit THEN
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

GRANT EXECUTE ON FUNCTION public.deduct_otto_question(UUID) TO service_role;
