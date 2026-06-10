-- FIX-1 (hotfix P0): align the Otto included-question limits in deduct_otto_question
-- with PLAN_LIMITS.ottoQuestionsPerMonth (the TypeScript SSOT in
-- packages/core/src/domain/subscription.ts).
--
-- Bug: the function hardcoded founder=5 / team=15 / studio=50, but the domain (and the UI,
-- pricing page, and the canAskOtto guard) promise founder=15 / team=45 / studio=120.
-- Effect: a Founder was blocked at their 6th question with "Failed to deduct question"
-- while the UI still showed ~10 included questions remaining. Paying users under-served.
--
-- Hotfix scope: values only, SAME signature (p_user_id uuid), no app-code change, so it
-- can ship without an expand/contract deploy. The proper architectural fix — passing the
-- limit as a parameter so SQL holds no business config — is deferred to FIX-1b (post-design).
--
-- ⚠️ DUAL SOURCE OF TRUTH: these values MUST stay in sync with PLAN_LIMITS in
-- packages/core/src/domain/subscription.ts until FIX-1b removes this CASE entirely.

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

  -- Included limit per plan — MUST match PLAN_LIMITS.ottoQuestionsPerMonth (TS SSOT).
  v_included_limit := CASE v_plan
    WHEN 'founder'    THEN 15
    WHEN 'team'       THEN 45
    WHEN 'studio'     THEN 120
    WHEN 'enterprise' THEN 2147483647   -- Infinity in TS
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

-- Re-assert the grant model (idempotent): service_role only, PUBLIC stays revoked (see FIX-5).
REVOKE EXECUTE ON FUNCTION public.deduct_otto_question(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.deduct_otto_question(UUID) TO service_role;
