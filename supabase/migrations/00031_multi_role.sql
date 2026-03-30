-- ============================================================
-- Migration: single role → multi-role (user_role[])
-- ============================================================

-- 1. Add the new array column with default (IF NOT EXISTS for idempotency)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'roles'
  ) THEN
    ALTER TABLE profiles ADD COLUMN roles user_role[] NOT NULL DEFAULT '{client}';
  END IF;
END $$;

-- 2. Migrate existing data: copy single role into array (only if old column exists)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'role'
  ) THEN
    UPDATE profiles SET roles = ARRAY[role];
  END IF;
END $$;

-- 3. Drop dependent policies and index that reference the old "role" column
DROP POLICY IF EXISTS bookings_insert_client ON bookings;
DROP INDEX IF EXISTS idx_profiles_role;

-- 4. Drop the old column (only if it exists)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'role'
  ) THEN
    ALTER TABLE profiles DROP COLUMN role;
  END IF;
END $$;

-- 5. Add index for array lookups
CREATE INDEX IF NOT EXISTS idx_profiles_roles ON profiles USING GIN (roles);

-- 6. Recreate the bookings_insert_client policy using the new roles array
CREATE POLICY bookings_insert_client ON bookings
  FOR INSERT WITH CHECK (
    client_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND 'client' = ANY(roles)
    )
  );

-- ============================================================
-- Update RLS helper functions
-- ============================================================

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND 'admin' = ANY(roles)
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_consultant()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND (
      'consultant' = ANY(roles) OR 'consultant_limited' = ANY(roles)
    )
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
  SELECT roles[1] FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- Update handle_new_user trigger to use roles array
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, roles)
  VALUES (
    NEW.id,
    NEW.email,
    ARRAY[COALESCE(
      (NEW.raw_user_meta_data->>'role')::user_role,
      'client'::user_role
    )]
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
