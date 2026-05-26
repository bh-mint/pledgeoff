-- Add role column to profiles for persistent role selection (replaces localStorage-only storage)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role TEXT NULL
  CONSTRAINT profiles_role_check CHECK (role IN ('indie', 'pm', 'agency'));

-- Rollback: ALTER TABLE public.profiles DROP COLUMN IF EXISTS role;
