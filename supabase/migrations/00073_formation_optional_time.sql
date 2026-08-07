-- Migration 00073: horaire facultatif sur les formations
--
-- Certains formats (webinaire, e-learning) n'ont qu'une date : l'heure n'a pas
-- de sens et afficher « 00h00 – 23h59 » serait faux. `starts_at`/`ends_at`
-- restent NOT NULL — la journee entiere y est encodee — et ce drapeau dit si
-- la partie horaire a ete saisie, donc si elle doit etre affichee.
--
-- Defaut `true` : toutes les formations existantes ont une heure reelle.
ALTER TABLE formations
  ADD COLUMN show_time BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN formations.show_time IS
  'false = aucune heure saisie : starts_at/ends_at couvrent la journee entiere et l''horaire n''est pas affiche.';
