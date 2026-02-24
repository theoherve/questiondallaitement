-- Migration for NextAuth: profiles become standalone (no Supabase Auth).
-- New users are created only in profiles with password_hash.

-- 1) Drop trigger that created profile on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2) Drop FK so profiles.id is no longer tied to auth.users
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- 3) Add password hash column for NextAuth credentials (nullable for existing Supabase Auth users)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- 4) Index for login lookup by email (already have idx_profiles_email, so optional)
-- CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
