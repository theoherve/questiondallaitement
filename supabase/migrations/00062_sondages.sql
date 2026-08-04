-- Sondages publics integres aux articles de blog.
--
-- Le premier besoin est un sondage precis (les reveils nocturnes), mais la
-- demande est de pouvoir en creer d'autres depuis l'administration sans
-- redeploiement. Les questions vivent donc en base, pas dans un fichier de
-- configuration.
--
-- Les reponses, elles, restent en JSONB : leur forme depend entierement de la
-- definition du sondage, et une table par cellule cochee multiplierait les
-- lignes par neuf sans rien apporter — l'agregat est fait par une vue qui
-- deplie ce JSONB.

CREATE TABLE IF NOT EXISTS surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  intro TEXT,
  -- « draft » : invisible du public. « published » : repond et affiche.
  -- « closed » : le graphique reste visible, le formulaire n'accepte plus rien.
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'closed')),
  -- Message affiche sur la page de remerciement, sous le resultat personnalise.
  thank_you_message TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_surveys_slug ON surveys (slug);

CREATE TABLE IF NOT EXISTS survey_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  position INT NOT NULL DEFAULT 0,

  -- « matrix » : une ligne par item, un choix unique par ligne (question 1).
  -- « single » : une seule ligne implicite, un choix unique (question bonus).
  kind TEXT NOT NULL CHECK (kind IN ('matrix', 'single')),
  label TEXT NOT NULL,

  -- [{ "key": "0-2-mois", "label": "0-2 mois" }, …]. Pour « single », une seule
  -- ligne de cle « _ » est posee a l'ecriture : la forme des reponses reste
  -- ainsi identique pour les deux types, et la vue d'agregat n'a qu'un cas.
  rows JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- [{ "key": "aucun", "label": "pas de reveils" }, …]. L'ordre porte le sens :
  -- il commande la couleur du segment dans le graphique.
  choices JSONB NOT NULL DEFAULT '[]'::jsonb,

  is_required BOOLEAN NOT NULL DEFAULT false,

  -- La question qui identifie le repondant pour la segmentation emailing.
  -- Indispensable : la question matricielle fait repondre le parent sur les
  -- neuf tranches d'age, pas sur celle de son bebe — elle ne dit donc pas a
  -- quel segment il appartient. Une question « single » dediee le dit.
  is_segment BOOLEAN NOT NULL DEFAULT false,

  -- La question portee par le graphique public. Une seule par sondage.
  is_charted BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_survey_questions_survey
  ON survey_questions (survey_id, position);

CREATE TABLE IF NOT EXISTS survey_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,

  -- { "<question_id>": { "<row_key>": "<choice_key>" } }
  answers JSONB NOT NULL,

  -- Cle de choix de la question marquee `is_segment`, recopiee ici pour eviter
  -- de fouiller le JSONB a chaque export ou filtre d'administration.
  segment_key TEXT,

  email TEXT,
  marketing_consent BOOLEAN NOT NULL DEFAULT false,
  -- Texte de la case tel qu'affiche au moment de la soumission. Meme raison que
  -- pour la newsletter : une formulation qui evolue ne doit pas rendre les
  -- consentements passes improuvables.
  consent_text TEXT,
  consented_at TIMESTAMPTZ,

  -- Page depuis laquelle le sondage a ete rempli (« /blog/mon-article »), pour
  -- savoir quel article convertit.
  source_path TEXT,

  -- Jamais l'adresse en clair : elle ne sert qu'a reperer un envoi massif.
  ip_hash TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_survey_responses_survey_created
  ON survey_responses (survey_id, created_at DESC);

-- ─── Agregats ───────────────────────────────────────────────
--
-- Calcules en base et non cote client : a plusieurs milliers de reponses,
-- rapatrier les lignes brutes dans le navigateur couterait cher et exposerait
-- des donnees individuelles que le widget public n'a pas a connaitre.

CREATE OR REPLACE VIEW survey_answer_counts AS
SELECT
  r.survey_id,
  q.question_id::uuid AS question_id,
  a.row_key,
  a.choice_key,
  count(*)::bigint AS responses
FROM survey_responses r
CROSS JOIN LATERAL jsonb_each(r.answers) AS q(question_id, row_map)
CROSS JOIN LATERAL jsonb_each_text(q.row_map) AS a(row_key, choice_key)
GROUP BY 1, 2, 3, 4;

CREATE OR REPLACE VIEW survey_response_counts AS
SELECT survey_id, count(*)::bigint AS total_responses
FROM survey_responses
GROUP BY survey_id;

-- Aucune policy : comme pour la newsletter, ces lignes ne sont lues que par le
-- service role via des routes serveur. La cle anon est publique par nature —
-- sans RLS elle lirait le fichier d'adresses email des repondants.
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER surveys_updated_at BEFORE UPDATE ON surveys
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
