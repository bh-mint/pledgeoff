-- Add extra_seats to subscriptions for Pro+ seat add-on (€7/seat/month)
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS extra_seats INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stripe_extra_seat_item_id TEXT;

-- stripe_extra_seat_item_id: Stripe subscription item ID for the seat add-on
-- used to update quantity on an existing subscription item

COMMENT ON COLUMN public.subscriptions.extra_seats IS 'Number of extra seats purchased as add-on (Pro+ only)';
COMMENT ON COLUMN public.subscriptions.stripe_extra_seat_item_id IS 'Stripe subscription item ID for the extra seat add-on line item';
