-- Codes promo partenaires, choisis formation par formation.
--
-- Jusqu'ici le code MILKPOWER était écrit en dur dans le code applicatif et
-- s'appliquait à toute formation ayant un lien d'inscription externe : ni le
-- code ni son périmètre n'étaient modifiables sans déploiement.
--
-- À ne pas confondre avec la table `promo_codes` : celle-ci porte les remises
-- appliquées à nos propres paiements. Ici il s'agit du code négocié avec
-- l'organisme, affiché à la visiteuse et transmis dans le lien qui l'emmène
-- chez lui. Nous ne l'appliquons pas, nous l'annonçons.

ALTER TABLE formations
  ADD COLUMN IF NOT EXISTS partner_promo_codes TEXT[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN formations.partner_promo_codes IS
  'Codes de réduction de l''organisme partenaire, affichés sur la carte et la '
  'fiche. Le premier est transmis au lien externe en paramètre `code`.';

-- Reprend l'état affiché aujourd'hui : le badge apparaissait sur toutes les
-- formations à lien externe, et sur elles seules.
UPDATE formations
SET partner_promo_codes = ARRAY['MILKPOWER']
WHERE external_url IS NOT NULL
  AND external_url <> ''
  AND partner_promo_codes = '{}';
