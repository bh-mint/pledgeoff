-- Migration: 0040_subscriptions_otto_balance
-- Adds Otto question balance tracking to subscriptions

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS otto_included_used   INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS otto_included_reset_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS otto_purchased        INT NOT NULL DEFAULT 0;
