-- Dossier famille : enfants rattachés à un profil client, et leurs pesées.
CREATE TABLE children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  birth_date DATE NOT NULL,
  sex TEXT NOT NULL CHECK (sex IN ('female', 'male')),
  is_premature BOOLEAN NOT NULL DEFAULT false,
  gestational_age_weeks INT CHECK (gestational_age_weeks IS NULL OR (gestational_age_weeks > 0 AND gestational_age_weeks < 45)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_children_client ON children(client_id);

CREATE TRIGGER children_updated_at
  BEFORE UPDATE ON children
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TABLE weight_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  weight_grams INT NOT NULL CHECK (weight_grams > 0 AND weight_grams < 50000),
  measured_at DATE NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('home', 'consultation')),
  recorded_by UUID NOT NULL REFERENCES profiles(id),
  consultant_id UUID REFERENCES consultants(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_weight_measurements_child ON weight_measurements(child_id);

ALTER TABLE children ENABLE ROW LEVEL SECURITY;
ALTER TABLE weight_measurements ENABLE ROW LEVEL SECURITY;

CREATE POLICY children_select_own ON children
  FOR SELECT USING (client_id = auth.uid());
CREATE POLICY children_insert_own ON children
  FOR INSERT WITH CHECK (client_id = auth.uid());
CREATE POLICY children_update_own ON children
  FOR UPDATE USING (client_id = auth.uid());
CREATE POLICY children_delete_own ON children
  FOR DELETE USING (client_id = auth.uid());
CREATE POLICY children_select_admin ON children
  FOR SELECT USING (is_admin());

CREATE POLICY weight_measurements_select_own ON weight_measurements
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM children c WHERE c.id = child_id AND c.client_id = auth.uid())
  );
-- Un client ne peut créer qu'une pesée « à domicile » signée de sa main : sans
-- ces conditions, il pourrait forger via l'API REST une pesée attribuée à une
-- consultation. Les écritures côté consultante passent par le service role,
-- qui contourne entièrement RLS : cette policy ne contraint que le client.
CREATE POLICY weight_measurements_insert_own ON weight_measurements
  FOR INSERT WITH CHECK (
    recorded_by = auth.uid()
    AND source = 'home'
    AND consultant_id IS NULL
    AND EXISTS (SELECT 1 FROM children c WHERE c.id = child_id AND c.client_id = auth.uid())
  );
-- Filet de sécurité derrière le contrôle applicatif (fenêtre de 24h incluse) :
-- un client ne supprime que les pesées qu'il a lui-même enregistrées.
CREATE POLICY weight_measurements_delete_own ON weight_measurements
  FOR DELETE USING (
    recorded_by = auth.uid()
    AND EXISTS (SELECT 1 FROM children c WHERE c.id = child_id AND c.client_id = auth.uid())
  );
CREATE POLICY weight_measurements_select_admin ON weight_measurements
  FOR SELECT USING (is_admin());
