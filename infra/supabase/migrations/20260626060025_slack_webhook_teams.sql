-- Add slack_webhook_url to teams — used for Slack integration (plan gate: team+)
ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS slack_webhook_url text;
