-- Migration 00024: Allow re-registration after soft-delete
-- The old UNIQUE(email) constraint blocks new signups when a profile
-- was soft-deleted (deleted_at IS NOT NULL) but the email column still
-- holds the original address.
-- Replace with a partial unique index that only enforces uniqueness
-- among active (non-deleted) profiles.
-- 1) Drop the existing unique constraint on email
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_email_key;
-- Also drop the plain index (will be replaced by the partial unique one)
DROP INDEX IF EXISTS idx_profiles_email;
-- 2) Create a partial unique index: email must be unique only among active profiles
CREATE UNIQUE INDEX idx_profiles_email_active ON profiles (email)
WHERE deleted_at IS NULL;
-- 3) Keep a non-unique index for lookups on deleted profiles (admin audit etc.)
CREATE INDEX idx_profiles_email_all ON profiles (email);