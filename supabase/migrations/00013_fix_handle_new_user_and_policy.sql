-- Fix "Database error saving new user": trigger must use search_path and RLS must allow trigger insert.
-- Run this in Supabase SQL Editor if migrations are not applied, or run: pnpm db:push

-- 1) RLS: allow trigger (auth.uid() IS NULL) and own-profile insert
DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
CREATE POLICY profiles_insert_own ON public.profiles
  FOR INSERT WITH CHECK (id = auth.uid() OR auth.uid() IS NULL);

-- 2) Trigger function with explicit search_path so public.user_role and public.profiles are found
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      (NEW.raw_user_meta_data->>'role')::public.user_role,
      'client'::public.user_role
    ),
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name'
  );
  RETURN NEW;
END;
$$;
