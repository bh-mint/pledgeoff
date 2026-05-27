-- Rename notification_preferences key: goldmine → signal_feed
-- Preserves existing user preference values; removes stale key atomically.
UPDATE public.profiles
SET notification_preferences = (notification_preferences - 'goldmine')
  || jsonb_build_object('signal_feed', COALESCE(notification_preferences -> 'goldmine', 'false'::jsonb))
WHERE notification_preferences ? 'goldmine';
