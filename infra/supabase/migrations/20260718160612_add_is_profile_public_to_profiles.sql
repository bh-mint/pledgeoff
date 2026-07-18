-- Add is_profile_public to profiles
-- Default TRUE: preserves current behavior for users who already set a username
-- (their profile has been publicly visible with zero control since launch) — no
-- previously-shared /profile/@handle link breaks silently. New + existing users
-- can opt out anytime from Settings.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_profile_public BOOLEAN NOT NULL DEFAULT true;
