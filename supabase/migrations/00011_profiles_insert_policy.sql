-- Fix: allow profile creation on signup (trigger handle_new_user was blocked by RLS)
-- The trigger runs in a context where auth.uid() is NULL, so we must allow that case.
DROP POLICY IF EXISTS profiles_insert_own ON profiles;
CREATE POLICY profiles_insert_own ON profiles
  FOR INSERT WITH CHECK (id = auth.uid() OR auth.uid() IS NULL);
