-- Fiche de consultation structurée légère (motif/antécédents/observation/conclusion),
-- rattachée à un booking et à un enfant (ou "consultation parent seule" si child_id est NULL).
CREATE TABLE consultation_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  consultant_id UUID NOT NULL REFERENCES consultants(id),
  child_id UUID REFERENCES children(id) ON DELETE SET NULL,

  motif TEXT NOT NULL DEFAULT '',

  antecedents_medicaux BOOLEAN NOT NULL DEFAULT false,
  antecedents_medicaux_detail TEXT,
  antecedents_chirurgicaux BOOLEAN NOT NULL DEFAULT false,
  antecedents_chirurgicaux_detail TEXT,
  allergies BOOLEAN NOT NULL DEFAULT false,
  allergies_detail TEXT,
  traitements_en_cours BOOLEAN NOT NULL DEFAULT false,
  traitements_en_cours_detail TEXT,

  observation TEXT NOT NULL DEFAULT '',
  conclusion TEXT NOT NULL DEFAULT '',

  notes_internes TEXT,

  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  published_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_consultation_notes_client ON consultation_notes(client_id);
CREATE INDEX idx_consultation_notes_child ON consultation_notes(child_id);

CREATE TRIGGER consultation_notes_updated_at
  BEFORE UPDATE ON consultation_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

ALTER TABLE consultation_notes ENABLE ROW LEVEL SECURITY;

-- Le client ne lit jamais une fiche en brouillon, ni les colonnes internes
-- via une policy à part : notes_internes reste exclu au niveau de la query
-- côté action (jamais un SELECT *), la policy ne porte que sur les lignes.
CREATE POLICY consultation_notes_select_own_published ON consultation_notes
  FOR SELECT USING (client_id = auth.uid() AND status = 'published');

CREATE POLICY consultation_notes_select_admin ON consultation_notes
  FOR SELECT USING (is_admin());

-- Aucune policy d'écriture pour le client. Important : ces policies sont
-- inertes sur le chemin applicatif réel de ce projet — toutes les server
-- actions (consultante comme client) utilisent createAdminClient(), le
-- client Supabase service-role, sous une session NextAuth. Aucun JWT
-- Supabase avec un auth.uid() n'est jamais émis pour une session navigateur
-- réelle ici, donc RLS ne s'applique jamais à ces requêtes : elles la
-- contournent entièrement. Elles restent posées en défense en profondeur
-- pour un futur accès PostgREST direct (hors service role). Le véritable
-- filet de sécurité côté client est la sélection explicite de colonnes dans
-- la server action (getMyPublishedConsultationNotes) : jamais de SELECT *,
-- notes_internes n'est jamais chargé.
