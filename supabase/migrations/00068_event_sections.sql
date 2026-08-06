-- ─── Sections editoriales d'une formation ────────────────────
-- La page de detail est desormais structuree en sections nommees plutot
-- qu'en un seul pave « A propos ». Chacune a sa forme a l'affichage, donc
-- chacune a sa colonne : les melanger dans un seul HTML rendrait le rendu
-- dependant du balisage saisi.
--
-- Toutes facultatives : une section vide n'est simplement pas affichee.

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS objectives_html TEXT,
  ADD COLUMN IF NOT EXISTS program_html TEXT,
  ADD COLUMN IF NOT EXISTS audience_html TEXT;

-- « A propos » disparait du produit. La colonne portait du texte scrape ;
-- elle n'est plus lue par aucun ecran.
--
-- SAUVEGARDE AVANT APPLICATION, la suppression est definitive :
--   psql "$DATABASE_URL" -c "\copy (SELECT id, slug, long_description \
--     FROM events WHERE long_description IS NOT NULL) \
--     TO 'backups/events_long_description.csv' CSV HEADER"
ALTER TABLE events
  DROP COLUMN IF EXISTS long_description;
