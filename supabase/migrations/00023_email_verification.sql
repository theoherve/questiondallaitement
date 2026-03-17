-- Add email verification columns to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS email_verification_token TEXT,
  ADD COLUMN IF NOT EXISTS email_verification_expires TIMESTAMPTZ;
-- Index for fast token lookup
CREATE INDEX IF NOT EXISTS idx_profiles_email_verification_token ON profiles (email_verification_token)
WHERE email_verification_token IS NOT NULL;
-- Mark all existing accounts as verified (they were created before this feature)
UPDATE profiles
SET email_verified = TRUE
WHERE email_verified = FALSE;