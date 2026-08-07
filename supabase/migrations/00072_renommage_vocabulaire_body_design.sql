-- Complement a 00070 : variables de fusion sous forme de noeud du block editor.
--
-- 00070 ne remplacait les variables que sous leur forme textuelle
-- « {{nom}} ». Le block editor (Maily) ne les stocke pas ainsi dans
-- `body_design` : il en fait des noeuds structures, du type
--
--   {"type": "variable", "attrs": {"id": "formation_title", "label": null, ...}}
--
-- Ces noeuds ont donc survecu au renommage. Symptome : l'email d'acces a un
-- accompagnement affichait le titre via une variable qui n'est plus alimentee,
-- donc vide — sans erreur nulle part.
--
-- Constate en production apres 00070, sur une occurrence
-- (email_templates.body_design du modele accompagnement_access). Le meme
-- echange est applique aux quatre colonnes porteuses, pour couvrir les lignes
-- creees d'ici l'application et les environnements reconstruits de zero.
--
-- Ordre impose, comme partout dans ce chantier : les deux formation_*
-- liberent la place avant que les quatre event_* ne l'occupent.
--
-- Les colonnes sont en jsonb : `::text` produit toujours la forme canonique
-- `"cle": "valeur"`, ce qui rend le motif de remplacement fiable.
--
-- ROLLBACK : reappliquer les memes replace() dans l'ordre inverse.

-- ─── formation_* libere la place ─────────────────────────────────────

UPDATE email_templates SET
  body_design = replace(replace(body_design::text,
                  '"id": "formation_title"', '"id": "accompagnement_title"'),
                  '"id": "formation_url"',   '"id": "accompagnement_url"')::jsonb
WHERE body_design::text LIKE '%"id": "formation_title"%'
   OR body_design::text LIKE '%"id": "formation_url"%';

UPDATE email_campaigns SET
  body_design = replace(replace(body_design::text,
                  '"id": "formation_title"', '"id": "accompagnement_title"'),
                  '"id": "formation_url"',   '"id": "accompagnement_url"')::jsonb
WHERE body_design::text LIKE '%"id": "formation_title"%'
   OR body_design::text LIKE '%"id": "formation_url"%';

UPDATE admin_workflow_steps SET
  action_config = replace(replace(action_config::text,
                    '"id": "formation_title"', '"id": "accompagnement_title"'),
                    '"id": "formation_url"',   '"id": "accompagnement_url"')::jsonb
WHERE action_config::text LIKE '%"id": "formation_title"%'
   OR action_config::text LIKE '%"id": "formation_url"%';

UPDATE automations SET
  actions = replace(replace(actions::text,
              '"id": "formation_title"', '"id": "accompagnement_title"'),
              '"id": "formation_url"',   '"id": "accompagnement_url"')::jsonb
WHERE actions::text LIKE '%"id": "formation_title"%'
   OR actions::text LIKE '%"id": "formation_url"%';

-- ─── event_* occupe le nom libere ────────────────────────────────────

UPDATE email_templates SET
  body_design = replace(replace(replace(replace(body_design::text,
                  '"id": "event_title"',    '"id": "formation_title"'),
                  '"id": "event_date"',     '"id": "formation_date"'),
                  '"id": "event_time"',     '"id": "formation_time"'),
                  '"id": "event_location"', '"id": "formation_location"')::jsonb
WHERE body_design::text ~ '"id": "event_(title|date|time|location)"';

UPDATE email_campaigns SET
  body_design = replace(replace(replace(replace(body_design::text,
                  '"id": "event_title"',    '"id": "formation_title"'),
                  '"id": "event_date"',     '"id": "formation_date"'),
                  '"id": "event_time"',     '"id": "formation_time"'),
                  '"id": "event_location"', '"id": "formation_location"')::jsonb
WHERE body_design::text ~ '"id": "event_(title|date|time|location)"';

UPDATE admin_workflow_steps SET
  action_config = replace(replace(replace(replace(action_config::text,
                    '"id": "event_title"',    '"id": "formation_title"'),
                    '"id": "event_date"',     '"id": "formation_date"'),
                    '"id": "event_time"',     '"id": "formation_time"'),
                    '"id": "event_location"', '"id": "formation_location"')::jsonb
WHERE action_config::text ~ '"id": "event_(title|date|time|location)"';

UPDATE automations SET
  actions = replace(replace(replace(replace(actions::text,
              '"id": "event_title"',    '"id": "formation_title"'),
              '"id": "event_date"',     '"id": "formation_date"'),
              '"id": "event_time"',     '"id": "formation_time"'),
              '"id": "event_location"', '"id": "formation_location"')::jsonb
WHERE actions::text ~ '"id": "event_(title|date|time|location)"';
