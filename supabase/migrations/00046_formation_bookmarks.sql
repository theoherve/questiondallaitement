-- Bookmarks: let clients mark blocks as favorites inside an accompaniment.
-- Scoped by enrollment so a client only bookmarks blocks of formations they own.

CREATE TABLE IF NOT EXISTS formation_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES formation_enrollments(id) ON DELETE CASCADE,
  block_id UUID NOT NULL REFERENCES formation_blocks(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (enrollment_id, block_id)
);

CREATE INDEX IF NOT EXISTS idx_formation_bookmarks_enrollment
  ON formation_bookmarks(enrollment_id);

CREATE INDEX IF NOT EXISTS idx_formation_bookmarks_block
  ON formation_bookmarks(block_id);

ALTER TABLE formation_bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY bookmarks_select_own ON formation_bookmarks
  FOR SELECT USING (
    enrollment_id IN (SELECT id FROM formation_enrollments WHERE client_id = auth.uid())
  );

CREATE POLICY bookmarks_insert_own ON formation_bookmarks
  FOR INSERT WITH CHECK (
    enrollment_id IN (SELECT id FROM formation_enrollments WHERE client_id = auth.uid())
  );

CREATE POLICY bookmarks_delete_own ON formation_bookmarks
  FOR DELETE USING (
    enrollment_id IN (SELECT id FROM formation_enrollments WHERE client_id = auth.uid())
  );
