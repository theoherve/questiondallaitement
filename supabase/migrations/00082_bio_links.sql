-- Page de liens courts, en remplacement de Linktree.
--
-- Carole tient une page linktr.ee pointée depuis sa bio Instagram. La faire
-- vivre chez nous supprime un abonnement, rapatrie les clics dans nos
-- statistiques et permet enfin de renvoyer vers nos propres pages sans passer
-- par un tiers.
--
-- Une seule table pour les liens ET les rubriques (« kind »), plutôt qu'une
-- table de sections avec des liens rattachés : la page est une liste ordonnée
-- unique, et un modèle parent/enfant obligerait à réordonner à deux niveaux
-- pour une hiérarchie qui n'existe pas visuellement.

CREATE TABLE IF NOT EXISTS bio_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- « link » : une carte cliquable. « header » : un intertitre qui ouvre une
  -- rubrique et ne porte pas d'URL.
  kind TEXT NOT NULL DEFAULT 'link' CHECK (kind IN ('link', 'header')),

  title TEXT NOT NULL,
  -- Ligne secondaire sous le titre. Absente du Linktree d'origine, elle évite
  -- les titres à rallonge du type « L'allaitement pour les nuls | Mon
  -- allaitement sur mesure | Choisir d'allaiter ».
  subtitle TEXT,
  url TEXT,

  -- Chemin d'une image de /public/liens, ou URL absolue. Les vignettes du
  -- Linktree ont été rapatriées : le compte pourra être supprimé sans casser
  -- les images.
  thumbnail_url TEXT,

  -- Une seule carte mise en avant à la fois : elle est affichée en pleine
  -- largeur, vignette en fond. Au-delà d'une, la mise en avant ne veut plus
  -- rien dire — l'interface d'administration le rappelle sans l'interdire.
  is_featured BOOLEAN NOT NULL DEFAULT false,

  is_active BOOLEAN NOT NULL DEFAULT true,
  position INT NOT NULL DEFAULT 0,

  -- Compteur cumulé, incrémenté en base (voir increment_bio_link_clicks) et
  -- non recalculé depuis une table d'évènements : nous voulons savoir quel
  -- lien porte, pas reconstituer un parcours.
  click_count INT NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Une rubrique sans titre n'a rien à afficher, un lien sans URL n'est pas
  -- cliquable : la contrainte évite les lignes à moitié remplies.
  CONSTRAINT bio_links_link_needs_url
    CHECK (kind <> 'link' OR (url IS NOT NULL AND url <> ''))
);

CREATE INDEX IF NOT EXISTS idx_bio_links_position
  ON bio_links (position);

CREATE TRIGGER bio_links_updated_at BEFORE UPDATE ON bio_links
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Même raison que pour les sondages : ces lignes ne sont lues que par le
-- service role depuis des routes serveur. Sans RLS, la clé anon — publique par
-- nature — exposerait les liens désactivés et les compteurs de clics.
ALTER TABLE bio_links ENABLE ROW LEVEL SECURITY;

-- ─── Comptage des clics ─────────────────────────────────────
--
-- Un UPDATE ... SET click_count = click_count + 1 en SQL est atomique : deux
-- clics simultanés ne s'écrasent pas, là où un lire-puis-écrire côté
-- application en perdrait un.

CREATE OR REPLACE FUNCTION increment_bio_link_clicks(link_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE bio_links
  SET click_count = click_count + 1
  WHERE id = link_id;
$$;

-- ─── Reprise du contenu Linktree ────────────────────────────
--
-- Les URL sont recopiées telles quelles, y compris celles qui pointent encore
-- vers caroleherve.fr : le remappage vers nos propres pages se fera depuis
-- l'administration, sans redéploiement. Un lien raccourci tr.ee a été résolu
-- vers sa destination, sinon supprimer le compte le casserait.

INSERT INTO bio_links (kind, title, subtitle, url, thumbnail_url, is_featured, position)
VALUES
  ('link',   'Sondage entre nous : mon bébé est-il le seul à se réveiller la nuit ?', NULL,
   'https://form.jotform.com/252900779262361', '/liens/sondage-reveils.png', false, 10),

  ('header', 'Formation à la une', NULL, NULL, NULL, false, 20),
  ('link',   'Le sommeil du tout petit et du jeune enfant', 'Formation animée par Carole Hervé',
   'https://www.caroleherve.fr/event-details/formation-le-sommeil-du-tout-petit-et-du-jeune-enfant',
   '/liens/formation-sommeil.jpeg', true, 30),

  ('header', '✨ Ton accompagnement VIP ✨', NULL, NULL, NULL, false, 40),
  ('link',   'Deviens actrice d''un allaitement dicté par tes codes', 'Le pack essentiel allaitement',
   'https://www.caroleherve.fr/pack-essentiel-allaitement', '/liens/pack-essentiel.png', false, 50),

  ('header', 'Tu préfères les modules à l''unité ?', NULL, NULL, NULL, false, 60),
  ('link',   'Je me prépare à allaiter', NULL,
   'https://www.caroleherve.fr/page-d-accompagnement/je-me-prepare-a-allaiter', NULL, false, 70),
  ('link',   'Mon allaitement des premiers jours', NULL,
   'https://www.caroleherve.fr/page-d-accompagnement/mon-allaitement-des-premiers-jours', NULL, false, 80),
  ('link',   'Help, j''ai une urgence : engorgement, mastite', NULL,
   'https://www.caroleherve.fr/page-d-accompagnement/les-urgences-de-allaitement', NULL, false, 90),
  ('link',   'La diversification de mon bébé allaité', NULL,
   'https://www.caroleherve.fr/page-d-accompagnement/la-diversification-de-mon-bebe-allaite', NULL, false, 100),
  ('link',   'Je reprends une activité professionnelle', NULL,
   'https://www.caroleherve.fr/page-d-accompagnement/je-reprends-une-activite-professionnelle',
   '/liens/reprise-travail.jpeg', false, 110),
  ('link',   'Je souhaite sevrer mon bébé', NULL,
   'https://www.caroleherve.fr/page-d-accompagnement/je-souhaite-sevrer-mon-bebe', NULL, false, 120),

  ('link',   'Ton mémo sur la conservation du lait maternel', 'Gratuit',
   'https://www.caroleherve.fr/freebie-conservation', NULL, false, 130),
  ('link',   'Un bundle spécial sur Wooskill', NULL,
   'https://www.wooskill.com/fr/woo-store/carole_24', '/liens/wooskill.png', false, 140),

  ('header', '📙 Offre-toi mes livres ! 📙', NULL, NULL, NULL, false, 150),
  ('link',   'Mes trois livres', 'L''allaitement pour les nuls · Mon allaitement sur mesure · Choisir d''allaiter',
   'https://www.caroleherve.fr/livres', NULL, false, 160),
  ('link',   'Choisir d''allaiter', 'Éditions First, en librairie indépendante',
   'https://www.librairiesindependantes.com/product/9782412081563/', NULL, false, 170),
  ('link',   'Mon allaitement sur mesure', 'Éditions Albin Michel, en librairie indépendante',
   'https://www.librairiesindependantes.com/product/9782226451774/', NULL, false, 180)
ON CONFLICT DO NOTHING;
