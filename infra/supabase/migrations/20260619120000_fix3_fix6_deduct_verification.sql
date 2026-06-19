-- FIX-3: Validation Pack becomes a consumable one-time balance.
-- Previously, verifications_purchased permanently raised the monthly cap, cannibalising plan upgrades.
-- Now: included quota (from ideas count) drains first; pack deducts atomically only when included is exhausted.
--
-- FIX-6: Pack "Scale" (100 → €120) is sold via Stripe + UI but was absent from the domain SSOT
-- (VALIDATION_PACK_SIZES = [10,25,60]). This function adds 100 to the supported range implicitly
-- (the domain TS fix is in packages/core/src/domain/subscription.ts).
--
-- Pattern mirrors deduct_otto_question exactly:
--   - FOR UPDATE lock on subscriptions row (eliminates SELECT-then-UPDATE race on pack balance)
--   - Ideas count read from ideas table (same UTC start-of-month logic as countThisMonth in TS)
--   - Included limit CASE must stay in sync with PLAN_LIMITS.verificationsPerMonth (TS SSOT)
--   ⚠️ DUAL SOURCE OF TRUTH: these limits MUST match PLAN_LIMITS in
--      packages/core/src/domain/subscription.ts until a future parametrisation removes this CASE.

CREATE OR REPLACE FUNCTION public.deduct_verification(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan                    TEXT;
  v_verifications_purchased INT;
  v_included_limit          INT;
  v_count_this_month        BIGINT;
BEGIN
  -- Lock the subscription row for the duration of this transaction.
  SELECT plan, verifications_purchased
  INTO v_plan, v_verifications_purchased
  FROM public.subscriptions
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN 'not_found';
  END IF;

  -- Included limit per plan — MUST match PLAN_LIMITS.verificationsPerMonth (TS SSOT).
  v_included_limit := CASE v_plan
    WHEN 'founder'    THEN 20
    WHEN 'team'       THEN 60
    WHEN 'studio'     THEN 100
    WHEN 'enterprise' THEN 200
    ELSE 1   -- free and any unknown plan
  END;

  -- Count ideas created this month (UTC) — same window as countThisMonth() in TS.
  SELECT COUNT(*)
  INTO v_count_this_month
  FROM public.ideas
  WHERE user_id  = p_user_id
    AND created_at >= date_trunc('month', NOW() AT TIME ZONE 'UTC');

  -- Under included limit: allow, no pack deduction needed.
  IF v_count_this_month < v_included_limit THEN
    RETURN 'ok';
  END IF;

  -- Included exhausted — try pack.
  IF v_verifications_purchased > 0 THEN
    UPDATE public.subscriptions
    SET verifications_purchased = verifications_purchased - 1,
        updated_at              = NOW()
    WHERE user_id = p_user_id;

    RETURN 'ok';
  END IF;

  RETURN 'no_balance';
END;
$$;

-- Grant model: service_role only — same as deduct_otto_question (see FIX-5).
REVOKE EXECUTE ON FUNCTION public.deduct_verification(UUID) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.deduct_verification(UUID) TO service_role;
