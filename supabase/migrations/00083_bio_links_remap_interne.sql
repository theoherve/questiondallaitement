-- Bascule des liens de la page /liens vers nos propres pages.
--
-- La reprise du Linktree (00082) a recopié les adresses telles quelles, dont
-- dix qui pointaient encore vers caroleherve.fr, l'ancien site. Huit ont un
-- équivalent ici : les y renvoyer était le but même de l'opération, sans quoi
-- la page de liens ferait de la publicité pour un site que nous remplaçons.
--
-- Écrit comme une migration et pas seulement appliqué en base : une
-- réinitialisation depuis les migrations rejouerait sinon 00082 seule et
-- ramènerait les anciennes adresses.
--
-- Les `WHERE url = ...` rendent chaque mise à jour idempotente : rejouée sur
-- une base déjà à jour, elle ne touche aucune ligne.

UPDATE bio_links SET url = '/accompagnements/je-me-prepare-a-allaiter'
WHERE url = 'https://www.caroleherve.fr/page-d-accompagnement/je-me-prepare-a-allaiter';

UPDATE bio_links SET url = '/accompagnements/mon-allaitement-des-premiers-jours'
WHERE url = 'https://www.caroleherve.fr/page-d-accompagnement/mon-allaitement-des-premiers-jours';

-- Le slug diffère de celui de l'ancien site (« les-urgences-allaitement » et
-- non « les-urgences-de-allaitement »).
UPDATE bio_links SET url = '/accompagnements/les-urgences-allaitement'
WHERE url = 'https://www.caroleherve.fr/page-d-accompagnement/les-urgences-de-allaitement';

UPDATE bio_links SET url = '/accompagnements/la-diversification-de-mon-bebe-allaite'
WHERE url = 'https://www.caroleherve.fr/page-d-accompagnement/la-diversification-de-mon-bebe-allaite';

UPDATE bio_links SET url = '/accompagnements/je-reprends-une-activite-professionnelle'
WHERE url = 'https://www.caroleherve.fr/page-d-accompagnement/je-reprends-une-activite-professionnelle';

UPDATE bio_links SET url = '/accompagnements/je-souhaite-sevrer-mon-bebe'
WHERE url = 'https://www.caroleherve.fr/page-d-accompagnement/je-souhaite-sevrer-mon-bebe';

-- « Pack essentiel allaitement » chez Wix, « Pack Mon Allaitement Sur Mesure »
-- ici : même offre, nom commercial différent.
UPDATE bio_links SET url = '/accompagnements/pack-mon-allaitement-sur-mesure'
WHERE url = 'https://www.caroleherve.fr/pack-essentiel-allaitement';

UPDATE bio_links SET url = '/livres'
WHERE url = 'https://www.caroleherve.fr/livres';

-- La liste plutôt que la session : une formation datée finit toujours par
-- passer, et un lien de bio qui mène à une session révolue déçoit. La liste
-- reste juste sans maintenance.
UPDATE bio_links SET url = '/formations'
WHERE url = 'https://www.caroleherve.fr/event-details/formation-le-sommeil-du-tout-petit-et-du-jeune-enfant';

-- Vignette vide héritée de Wix : un rectangle gris de 358 x 200 sans contenu.
UPDATE bio_links SET thumbnail_url = NULL
WHERE thumbnail_url = '/liens/pack-essentiel.png';
