-- Rename plan values: pro→founder, pro_plus→team, agency→studio

-- 1. Drop old check constraint
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_check;

-- 2. Migrate existing rows
UPDATE public.subscriptions SET plan = 'founder' WHERE plan = 'pro';
UPDATE public.subscriptions SET plan = 'team'    WHERE plan = 'pro_plus';
UPDATE public.subscriptions SET plan = 'studio'  WHERE plan = 'agency';

-- 3. Add new check constraint
ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_plan_check
  CHECK (plan IN ('free', 'founder', 'team', 'studio', 'enterprise'));
