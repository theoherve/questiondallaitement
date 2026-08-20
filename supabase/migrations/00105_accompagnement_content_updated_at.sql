-- Horodatage explicite de derniere modification de contenu, distinct de tout
-- `updated_at` generique : le badge "contenu ameliore" (affiche 6 mois) doit
-- reagir a un vrai changement de contenu (titre, accroche, contenu de bloc),
-- jamais a un simple reordonnancement (`position`). Colonne mise a jour par
-- l'application (actions.ts), pas par trigger, pour eviter qu'un
-- UPDATE ... SET position = ... ne la touche par accident.
alter table accompagnement_sections
  add column content_updated_at timestamptz;

alter table accompagnement_blocks
  add column content_updated_at timestamptz;
