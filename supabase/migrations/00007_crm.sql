-- CRM notes (private per consultant)
CREATE TABLE crm_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES profiles(id),
  consultant_id UUID NOT NULL REFERENCES consultants(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_crm_notes_client ON crm_notes(client_id);
CREATE INDEX idx_crm_notes_consultant ON crm_notes(consultant_id);

CREATE TRIGGER crm_notes_updated_at
  BEFORE UPDATE ON crm_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- CRM tags (consultant-specific or global)
CREATE TABLE crm_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  color TEXT,
  consultant_id UUID REFERENCES consultants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_crm_tags_consultant ON crm_tags(consultant_id);

-- Junction: tag assignments to contacts
CREATE TABLE crm_contact_tags (
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES crm_tags(id) ON DELETE CASCADE,
  consultant_id UUID NOT NULL REFERENCES consultants(id) ON DELETE CASCADE,
  PRIMARY KEY (client_id, tag_id, consultant_id)
);
