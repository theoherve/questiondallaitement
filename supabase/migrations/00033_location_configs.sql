-- Migration 00033: Global location configuration table
-- Admin-managed location types with shared address for cabinet

CREATE TABLE IF NOT EXISTS location_configs (
  location_type consultation_location PRIMARY KEY,
  label         TEXT NOT NULL,
  description   TEXT,
  address       TEXT,
  city          TEXT,
  postal_code   TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  sort_order    INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-update updated_at
CREATE TRIGGER set_location_configs_updated_at
  BEFORE UPDATE ON location_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE location_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "location_configs_public_read"
  ON location_configs FOR SELECT
  USING (true);

CREATE POLICY "location_configs_admin_write"
  ON location_configs FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Seed initial data
INSERT INTO location_configs (location_type, label, description, address, city, postal_code, is_active, sort_order)
VALUES
  ('cabinet',          'Au cabinet',       'Rendez-vous en personne au cabinet',              '9 Rue Collette', 'Paris', '75017', true,  1),
  ('teleconsultation', 'Téléconsultation', 'Rendez-vous en visio depuis chez vous',           NULL,             NULL,    NULL,    true,  2),
  ('domicile',         'À domicile',       'La consultante se déplace chez vous (supplément possible)', NULL, NULL, NULL, true, 3)
ON CONFLICT (location_type) DO NOTHING;
