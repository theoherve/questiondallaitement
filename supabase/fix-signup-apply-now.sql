-- ============================================================
-- À exécuter dans : Supabase Dashboard → SQL Editor → New query
-- Colle ce fichier entier et clique "Run"
-- ============================================================
-- Corrige "Database error saving new user" (RLS + search_path trigger)

-- 1) Politique INSERT pour que le trigger puisse créer le profil (auth.uid() = NULL dans le trigger)
DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
CREATE POLICY profiles_insert_own ON public.profiles
  FOR INSERT WITH CHECK (id = auth.uid() OR auth.uid() IS NULL);

-- 2) Trigger avec search_path = public pour trouver user_role et profiles
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
