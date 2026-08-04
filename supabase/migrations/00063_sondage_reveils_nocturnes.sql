-- Le sondage de Carole, repris du formulaire Jotform qu'il remplace.
--
-- Pose en migration plutot qu'a la main : l'environnement de developpement, les
-- previews et la production doivent partir de la meme definition, et les cles
-- de choix — recopiees dans chaque reponse — ne doivent pas differer d'un
-- environnement a l'autre.
--
-- Une troisieme question est ajoutee par rapport a Jotform : l'age du bebe du
-- repondant. La question matricielle fait repondre sur les neuf tranches, elle
-- ne dit donc pas a quel segment la famille appartient — sans cette question,
-- ni la segmentation Brevo ni le resultat personnalise ne sont calculables.

INSERT INTO surveys (slug, title, intro, status, thank_you_message)
VALUES (
  'reveils-nocturnes-bebe',
  'Mon bébé est-il le seul à se réveiller la nuit ?',
  'Merci de participer à ce petit sondage entre parents ! L''objectif est de montrer la réalité des réveils nocturnes des bébés selon leur tranche d''âge ✨',
  'draft',
  'N''hésitez pas à revenir remplir ce sondage dans quelques mois, quand votre bébé aura grandi.'
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO survey_questions
  (survey_id, position, kind, label, rows, choices, is_required, is_segment, is_charted)
SELECT
  s.id, 0, 'single',
  'Quel âge a votre bébé ?',
  '[{"key": "_", "label": ""}]'::jsonb,
  '[
    {"key": "0-2-mois",   "label": "0-2 mois"},
    {"key": "2-4-mois",   "label": "2-4 mois"},
    {"key": "4-6-mois",   "label": "4-6 mois"},
    {"key": "6-9-mois",   "label": "6-9 mois"},
    {"key": "9-12-mois",  "label": "9-12 mois"},
    {"key": "12-18-mois", "label": "12-18 mois"},
    {"key": "18-24-mois", "label": "18-24 mois"},
    {"key": "2-3-ans",    "label": "2-3 ans"},
    {"key": "3-4-ans",    "label": "3-4 ans"}
  ]'::jsonb,
  true, true, false
FROM surveys s
WHERE s.slug = 'reveils-nocturnes-bebe'
  AND NOT EXISTS (
    SELECT 1 FROM survey_questions q
    WHERE q.survey_id = s.id AND q.position = 0
  );

INSERT INTO survey_questions
  (survey_id, position, kind, label, rows, choices, is_required, is_segment, is_charted)
SELECT
  s.id, 1, 'matrix',
  'Combien de réveils nocturnes observez-vous en moyenne selon l''âge de votre bébé ?',
  '[
    {"key": "0-2-mois",   "label": "0-2 mois"},
    {"key": "2-4-mois",   "label": "2-4 mois"},
    {"key": "4-6-mois",   "label": "4-6 mois"},
    {"key": "6-9-mois",   "label": "6-9 mois"},
    {"key": "9-12-mois",  "label": "9-12 mois"},
    {"key": "12-18-mois", "label": "12-18 mois"},
    {"key": "18-24-mois", "label": "18-24 mois"},
    {"key": "2-3-ans",    "label": "2-3 ans"},
    {"key": "3-4-ans",    "label": "3-4 ans"}
  ]'::jsonb,
  -- L'ordre commande la couleur : vert, marron clair, rose moyen, rose soutenu.
  '[
    {"key": "aucun",     "label": "pas de réveils"},
    {"key": "quelques",  "label": "quelques réveils"},
    {"key": "un-a-deux", "label": "1 à 2 réveils / nuit"},
    {"key": "plusieurs", "label": "plusieurs réveils / nuit"}
  ]'::jsonb,
  false, false, true
FROM surveys s
WHERE s.slug = 'reveils-nocturnes-bebe'
  AND NOT EXISTS (
    SELECT 1 FROM survey_questions q
    WHERE q.survey_id = s.id AND q.position = 1
  );

INSERT INTO survey_questions
  (survey_id, position, kind, label, rows, choices, is_required, is_segment, is_charted)
SELECT
  s.id, 2, 'single',
  'Question bonus : quel est le sujet qui vous importe le plus sur le sommeil de votre bébé allaité ?',
  '[{"key": "_", "label": ""}]'::jsonb,
  '[
    {"key": "reveils-nocturnes",   "label": "Les réveils nocturnes"},
    {"key": "siestes-courtes",     "label": "Les siestes courtes"},
    {"key": "endormissement-sein", "label": "L''endormissement au sein"},
    {"key": "mauvaises-habitudes", "label": "La peur des mauvaises habitudes"},
    {"key": "attachement",         "label": "L''attachement"},
    {"key": "organisation",        "label": "L''organisation du sommeil (cododo ou non)"},
    {"key": "tenir-le-jour",       "label": "Tenir le coup la journée"},
    {"key": "peur-accident",       "label": "La peur d''un accident"},
    {"key": "lactation",           "label": "Le maintien ou la baisse de la lactation"},
    {"key": "exterieur",           "label": "L''adaptabilité à l''extérieur"}
  ]'::jsonb,
  false, false, false
FROM surveys s
WHERE s.slug = 'reveils-nocturnes-bebe'
  AND NOT EXISTS (
    SELECT 1 FROM survey_questions q
    WHERE q.survey_id = s.id AND q.position = 2
  );
