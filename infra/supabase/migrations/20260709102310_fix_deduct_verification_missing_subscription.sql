-- Fix: deduct_verification returned 'not_found' for users without a
-- subscriptions row, so a brand-new free user got a 500 on their first idea.
-- Absent row = legitimate free user (same semantics as getUserPlan):
-- treat as the free plan (included limit 1, no pack credits).
-- An advisory xact lock replaces the FOR UPDATE row lock in this branch so
-- two concurrent requests cannot both pass the count check.

CREATE OR REPLACE FUNCTION public.deduct_verification(p_user_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    -- No subscription row = new free user (row is created lazily elsewhere).
    -- No row to lock, so serialize concurrent requests per user with an
    -- advisory lock held until the end of this transaction.
    PERFORM pg_advisory_xact_lock(hashtext('deduct_verification:' || p_user_id::text));

    SELECT COUNT(*)
    INTO v_count_this_month
    FROM public.ideas
    WHERE user_id  = p_user_id
      AND created_at >= date_trunc('month', NOW() AT TIME ZONE 'UTC');

    -- Free included limit — MUST match PLAN_LIMITS.verificationsPerMonth (TS SSOT).
    IF v_count_this_month < 1 THEN
      RETURN 'ok';
    END IF;

    RETURN 'no_balance';
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
$function$;
