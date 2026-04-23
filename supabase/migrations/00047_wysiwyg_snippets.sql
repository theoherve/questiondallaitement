-- Global WYSIWYG snippets: reusable HTML fragments shared across all admins.
-- Writable by admin/consultant, readable by all signed-in users (they're only
-- exposed inside admin UI anyway).

CREATE TABLE IF NOT EXISTS wysiwyg_snippets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  html TEXT NOT NULL,
  category TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wysiwyg_snippets_category
  ON wysiwyg_snippets(category);

CREATE INDEX IF NOT EXISTS idx_wysiwyg_snippets_created_at
  ON wysiwyg_snippets(created_at DESC);

ALTER TABLE wysiwyg_snippets ENABLE ROW LEVEL SECURITY;

CREATE POLICY snippets_select_signed_in ON wysiwyg_snippets
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY snippets_insert_staff ON wysiwyg_snippets
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND (
          'admin' = ANY(roles)
          OR 'marketing_manager' = ANY(roles)
          OR 'consultant' = ANY(roles)
          OR 'consultant_limited' = ANY(roles)
        )
    )
  );

CREATE POLICY snippets_update_staff ON wysiwyg_snippets
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND (
          'admin' = ANY(roles)
          OR 'marketing_manager' = ANY(roles)
          OR 'consultant' = ANY(roles)
          OR 'consultant_limited' = ANY(roles)
        )
    )
  );

CREATE POLICY snippets_delete_staff ON wysiwyg_snippets
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND (
          'admin' = ANY(roles)
          OR 'marketing_manager' = ANY(roles)
          OR 'consultant' = ANY(roles)
          OR 'consultant_limited' = ANY(roles)
        )
    )
  );
