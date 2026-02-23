-- Formations (LMS)
CREATE TABLE formations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id UUID NOT NULL REFERENCES consultants(id),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  short_description TEXT,
  thumbnail_url TEXT,
  price_cents INT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'eur',
  status formation_status NOT NULL DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_formations_consultant ON formations(consultant_id);
CREATE INDEX idx_formations_slug ON formations(slug);
CREATE INDEX idx_formations_status ON formations(status);

CREATE TRIGGER formations_updated_at
  BEFORE UPDATE ON formations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Co-creation: multiple consultants can collaborate on a formation
CREATE TABLE formation_collaborators (
  formation_id UUID NOT NULL REFERENCES formations(id) ON DELETE CASCADE,
  consultant_id UUID NOT NULL REFERENCES consultants(id) ON DELETE CASCADE,
  revenue_share DECIMAL(5,2) NOT NULL DEFAULT 0,
  PRIMARY KEY (formation_id, consultant_id)
);

-- Sections within a formation
CREATE TABLE formation_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  formation_id UUID NOT NULL REFERENCES formations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_formation_sections_formation ON formation_sections(formation_id);

-- Content blocks within a section
CREATE TABLE formation_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES formation_sections(id) ON DELETE CASCADE,
  type block_type NOT NULL,
  content JSONB NOT NULL DEFAULT '{}',
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_formation_blocks_section ON formation_blocks(section_id);

-- Enrollments: tracks who bought which formation
CREATE TABLE formation_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES profiles(id),
  formation_id UUID NOT NULL REFERENCES formations(id),
  stripe_payment_intent_id TEXT,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (client_id, formation_id)
);

CREATE INDEX idx_formation_enrollments_client ON formation_enrollments(client_id);
CREATE INDEX idx_formation_enrollments_formation ON formation_enrollments(formation_id);

-- Progress tracking per block
CREATE TABLE formation_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES formation_enrollments(id) ON DELETE CASCADE,
  block_id UUID NOT NULL REFERENCES formation_blocks(id) ON DELETE CASCADE,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  UNIQUE (enrollment_id, block_id)
);

CREATE INDEX idx_formation_progress_enrollment ON formation_progress(enrollment_id);
