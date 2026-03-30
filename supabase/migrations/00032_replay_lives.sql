-- Migration: replay_lives table
-- Stores monthly live workshop replays for the ReplayLives page

CREATE TABLE IF NOT EXISTS replay_lives (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL,
  vimeo_url   text NOT NULL,
  description text,
  live_date   date NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Auto-update updated_at on row modification
CREATE OR REPLACE FUNCTION update_replay_lives_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER replay_lives_updated_at
  BEFORE UPDATE ON replay_lives
  FOR EACH ROW EXECUTE FUNCTION update_replay_lives_updated_at();

-- Row Level Security
ALTER TABLE replay_lives ENABLE ROW LEVEL SECURITY;

-- Public read access (page is shared by email link — no auth required)
CREATE POLICY "replay_lives_public_read"
  ON replay_lives FOR SELECT
  USING (true);

-- Admin write access only (uses is_admin() helper defined in 00031_multi_role.sql)
CREATE POLICY "replay_lives_admin_insert"
  ON replay_lives FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "replay_lives_admin_update"
  ON replay_lives FOR UPDATE
  USING (is_admin());

CREATE POLICY "replay_lives_admin_delete"
  ON replay_lives FOR DELETE
  USING (is_admin());
