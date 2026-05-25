-- Add notification_preferences column to profiles
-- Stores per-user email notification toggles as JSON object.
-- Keys: accuracy_report, queue_alerts, weekly_digest, goldmine, score

alter table public.profiles
  add column if not exists notification_preferences jsonb not null default '{}';