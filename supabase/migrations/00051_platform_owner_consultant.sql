-- Consultante proprietaire de la plateforme.
--
-- Carole est a la fois editrice et consultante. Faire transiter ses propres
-- consultations par un compte Connect Express serait un aller-retour : les
-- fonds partent de son compte plateforme vers un compte connecte qui lui
-- appartient, pour revenir sur son compte bancaire — en passant par un compte
-- Express que Stripe peut facturer. Et la commission qu'elle se verserait a
-- elle-meme apparaitrait dans les reversements comme un flux reel.
--
-- Une vente portee par la proprietaire reste donc encaissee sur la plateforme,
-- sans destinataire ni commission.

ALTER TABLE consultants
  ADD COLUMN IF NOT EXISTS is_platform_owner BOOLEAN NOT NULL DEFAULT false;

-- Une seule proprietaire possible : deux fiches marquees rendraient le routage
-- ambigu et laisseraient des fonds sur la plateforme sans destinataire.
CREATE UNIQUE INDEX IF NOT EXISTS consultants_single_platform_owner
  ON consultants ((true))
  WHERE is_platform_owner;

-- Carole HERVÉ (contact@caroleherve.fr). Idempotent : sans effet si la fiche
-- n'existe pas dans cet environnement.
UPDATE consultants
SET is_platform_owner = true
WHERE id = '31b9a2da-c1ee-4a71-9c41-055b60bbd22a';
