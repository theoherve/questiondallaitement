-- Migration 00015: Cleanup legacy auth artifacts + password reset support
-- Context: ADR-008 migrated from Supabase Auth to NextAuth v5.
-- The trigger on_auth_user_created was dropped in 00014, but the function
-- handle_new_user() and the permissive insert policy remain orphaned.

-- 1) Drop the orphaned handle_new_user() function (trigger removed in 00014)
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- 2) Fix profiles_insert_own: remove auth.uid() IS NULL (was only needed for the trigger)
-- With NextAuth, server-side uses service role key (bypasses RLS).
-- This clause was a security risk allowing unauthenticated inserts.
DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
CREATE POLICY profiles_insert_own ON public.profiles
  FOR INSERT WITH CHECK (id = auth.uid());

-- 3) Add password reset columns to profiles (story 02-06)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS password_reset_token TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_profiles_reset_token
  ON profiles(password_reset_token) WHERE password_reset_token IS NOT NULL;
