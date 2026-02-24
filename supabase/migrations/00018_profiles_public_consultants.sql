-- Allow anyone (including anonymous visitors) to read the profile of active consultants.
-- Required for public pages (consultantes, formations, evenements) that display consultant
-- names and avatars. Without this, auth.uid() is null (NextAuth is used, not Supabase Auth)
-- so no profile row was visible and joins returned empty.
CREATE POLICY profiles_select_public_consultants ON profiles
  FOR SELECT USING (
    id IN (SELECT id FROM consultants WHERE is_active = true)
  );
