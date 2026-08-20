-- Migration 00103: categorie sur les definitions de formations recurrentes
--
-- `recurring_formation_definitions` (00039, renommee en 00071) est anterieure
-- a la categorie de formation (00075) : le generateur de recurrences
-- (generate-formations.ts) n'avait donc aucune categorie a reporter sur les
-- occurrences qu'il cree, et chaque formation generee retombait sur le defaut
-- 'formation' de la table `formations`, quel que soit le format reel de la
-- serie (atelier mensuel, webinaire...).

ALTER TABLE recurring_formation_definitions
  ADD COLUMN category formation_category NOT NULL DEFAULT 'formation';

COMMENT ON COLUMN recurring_formation_definitions.category IS
  'Categorie reportee sur chaque occurrence generee (cf. formations.category).';
