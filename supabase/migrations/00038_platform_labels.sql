-- ─── Platform Labels System ─────────────────────────────────
-- Separate from consultant-scoped crm_tags/crm_contact_tags.
-- Used for audience targeting in admin workflows.

CREATE TABLE labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT '#6B7280',
  auto_assign_rule JSONB DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER labels_updated_at
  BEFORE UPDATE ON labels
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TABLE contact_labels (
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  label_id UUID NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  assigned_by TEXT NOT NULL DEFAULT 'auto',
  PRIMARY KEY (profile_id, label_id)
);

CREATE INDEX idx_contact_labels_label ON contact_labels(label_id);
CREATE INDEX idx_contact_labels_profile ON contact_labels(profile_id);

-- ─── RLS ────────────────────────────────────────────────────

ALTER TABLE labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_labels ENABLE ROW LEVEL SECURITY;

CREATE POLICY labels_select ON labels
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND 'admin' = ANY(roles))
  );

CREATE POLICY labels_insert ON labels
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND 'admin' = ANY(roles))
  );

CREATE POLICY labels_update ON labels
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND 'admin' = ANY(roles))
  );

CREATE POLICY labels_delete ON labels
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND 'admin' = ANY(roles))
  );

CREATE POLICY contact_labels_select ON contact_labels
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND 'admin' = ANY(roles))
  );

CREATE POLICY contact_labels_insert ON contact_labels
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND 'admin' = ANY(roles))
  );

CREATE POLICY contact_labels_delete ON contact_labels
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND 'admin' = ANY(roles))
  );
