-- ─── Resume d'evenement ──────────────────────────────────────
-- Un troisieme niveau de lecture entre `description` (une phrase, texte brut)
-- et `long_description` (le texte long deja affiche plus bas dans la page).
-- Mis en forme, donc HTML : l'editeur du back-office produit des paragraphes,
-- des listes et du gras.
--
-- Facultative : les evenements deja publies restent valides sans reprise. Un
-- resume vide n'affiche aucun bloc, c'est la regle produit, la colonne peut
-- donc rester NULL indefiniment.

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS summary_html TEXT;
