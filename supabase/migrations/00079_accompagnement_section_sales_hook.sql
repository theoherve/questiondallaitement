-- Migration 00079: accroche commerciale par chapitre d'accompagnement
--
-- Les pages de vente des modules affichent le programme lu en base. Un titre
-- de chapitre dit ce qu'il contient, pas ce qu'il change pour la lectrice.
-- `sales_hook` porte cette phrase de benefice, editable en back-office.
--
-- Nullable et sans backfill : la page de vente n'affiche rien quand la colonne
-- est vide. Le choix d'une colonne plutot que d'un fichier de contenu indexe
-- sur le titre est delibere : le contenu pedagogique va etre refait, et une
-- accroche indexee sur le titre disparaitrait au premier renommage.

ALTER TABLE accompagnement_sections
  ADD COLUMN sales_hook text;

COMMENT ON COLUMN accompagnement_sections.sales_hook IS
  'Phrase de benefice affichee sous le titre du chapitre sur la page de vente publique. Nullable.';
