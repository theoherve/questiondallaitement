-- Training providers (external organisms that host formations)
CREATE TABLE training_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  website_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_training_providers_slug ON training_providers(slug);

-- RLS: anyone can read training providers
ALTER TABLE training_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY training_providers_select_all ON training_providers
  FOR SELECT USING (true);

CREATE POLICY training_providers_manage_admin ON training_providers
  FOR ALL USING (is_admin());

-- Add external event fields to events
ALTER TABLE events
  ADD COLUMN provider_id UUID REFERENCES training_providers(id),
  ADD COLUMN external_url TEXT,
  ADD COLUMN discounted_price_cents INT;

-- Seed the 4 providers
INSERT INTO training_providers (name, slug) VALUES
  ('Moi en direct', 'moi-en-direct'),
  ('L''EDBN', 'edbn'),
  ('Le CPFCO', 'cpfco'),
  ('Dyskate', 'dyskate');
