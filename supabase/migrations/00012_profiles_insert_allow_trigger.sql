-- Allow trigger handle_new_user to insert profile (auth.uid() is NULL in trigger context)
DROP POLICY IF EXISTS profiles_insert_own ON profiles;
CREATE POLICY profiles_insert_own ON profiles
  FOR INSERT WITH CHECK (id = auth.uid() OR auth.uid() IS NULL);
