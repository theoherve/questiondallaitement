-- Migration 00076: fiche de formation partagee entre ses sessions
--
-- Une meme formation revient jusqu'a quarante fois dans le calendrier :
-- « Allaitement maternel - Les indispensables » a une quarantaine de dates
-- sur 2026-2027. Le resume, les objectifs, le programme et le public vise y
-- sont pourtant identiques d'une date a l'autre. Les stocker sur chaque
-- session imposerait quarante saisies et autant d'occasions de divergence.
--
-- La fiche vit donc a part, et chaque session y renvoie. Les colonnes de
-- contenu restent malgre tout sur `formations` : elles gagnent quand elles
-- sont remplies, ce qui laisse une session s'ecarter du modele (un programme
-- amenage, un public elargi) sans devoir creer une fiche jumelle.
--
-- Le titre fait exception et reste porte par la session. Il sert de slug,
-- d'objet d'email et d'entree dans les listes d'administration ; le faire
-- dependre d'une jointure rendrait ces usages fragiles. Le formulaire du
-- back-office le pre-remplit depuis la fiche choisie.

CREATE TABLE formation_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  -- Titre de reference, propose a la creation d'une session.
  title TEXT NOT NULL,

  -- Memes colonnes que sur `formations`, meme role, meme editeur.
  summary_html TEXT,
  objectives_html TEXT,
  program_html TEXT,
  audience_html TEXT,

  -- Page de l'organisme qui commercialise la formation.
  external_url TEXT,
  -- Mention libre (certification, eligibilite), cf. 00075.
  badge TEXT,
  category formation_category NOT NULL DEFAULT 'formation',

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_formation_templates_slug ON formation_templates(slug);

CREATE TRIGGER formation_templates_updated_at
  BEFORE UPDATE ON formation_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Le contenu d'une fiche est destine au public : il s'affiche sur chaque page
-- de session. Le proteger en lecture n'aurait donc rien a proteger.
ALTER TABLE formation_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY formation_templates_select_all ON formation_templates
  FOR SELECT USING (true);

CREATE POLICY formation_templates_manage_admin ON formation_templates
  FOR ALL USING (is_admin());

-- `ON DELETE SET NULL` : supprimer une fiche ne doit jamais emporter des
-- sessions auxquelles des personnes sont inscrites.
ALTER TABLE formations
  ADD COLUMN template_id UUID REFERENCES formation_templates(id) ON DELETE SET NULL;

CREATE INDEX idx_formations_template ON formations(template_id);

COMMENT ON COLUMN formations.template_id IS
  'Fiche partagee dont la session herite le contenu editorial. '
  'Les colonnes locales non vides restent prioritaires.';

-- ─── Formations sans date ───────────────────────────────────────
--
-- Les e-learning et les webconferences en differe sont accessibles a tout
-- moment. `starts_at` reste NOT NULL, parce que toute la table en depend, mais
-- sa valeur ne veut alors rien dire : ces formations ne sont ni « a venir » ni
-- « passees », et les classer par date les ferait disparaitre du site le
-- lendemain de leur mise en ligne.
--
-- Le drapeau les sort des deux listes chronologiques et les regroupe dans une
-- section « Disponibles a tout moment ».

ALTER TABLE formations
  ADD COLUMN is_evergreen BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN formations.is_evergreen IS
  'true = accessible en permanence : ni a venir ni passee, starts_at n''a pas de sens.';
