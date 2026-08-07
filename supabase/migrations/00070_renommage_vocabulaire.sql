-- Renommage du vocabulaire : evenement -> formation -> accompagnement.
--
-- Echange circulaire : le nom « formation » est a la fois libere par les
-- accompagnements et occupe par l'ex-« event ». L'ordre des blocs, et
-- l'ordre des instructions a l'interieur de chaque bloc, est donc impose.
-- Inverser deux lignes ne produit pas une erreur : ca produit une donnee
-- fausse.
--
-- ─────────────────────────────────────────────────────────────────────
-- SAUVEGARDE OBLIGATOIRE AVANT APPLICATION
--
-- Les blocs 5 a 9 modifient des lignes metier. Ils ne se defont pas par un
-- renommage inverse.
--
--   pg_dump "$DATABASE_URL" --data-only \
--     -t formations -t formation_enrollments -t formation_sections \
--     -t formation_blocks -t formation_progress -t formation_bookmarks \
--     -t formation_collaborators -t events -t event_registrations \
--     -t recurring_event_definitions -t automations -t admin_workflows \
--     -t admin_workflow_steps -t scheduled_workflow_actions -t labels \
--     -t email_templates -t email_campaigns -t crm_segments \
--     -t withdrawal_waivers -t payments -t promo_code_targets \
--     -t promo_code_triggers \
--     > backups/pre-00070.sql
-- ─────────────────────────────────────────────────────────────────────

BEGIN;

-- ═══ Bloc 1a : liberer le nom « formation » ══════════════════════════

ALTER TABLE formations              RENAME TO accompagnements;
ALTER TABLE formation_enrollments   RENAME TO accompagnement_enrollments;
ALTER TABLE formation_sections      RENAME TO accompagnement_sections;
ALTER TABLE formation_blocks        RENAME TO accompagnement_blocks;
ALTER TABLE formation_progress      RENAME TO accompagnement_progress;
ALTER TABLE formation_bookmarks     RENAME TO accompagnement_bookmarks;
ALTER TABLE formation_collaborators RENAME TO accompagnement_collaborators;

ALTER TABLE accompagnement_sections      RENAME COLUMN formation_id TO accompagnement_id;
ALTER TABLE accompagnement_enrollments   RENAME COLUMN formation_id TO accompagnement_id;
ALTER TABLE accompagnement_collaborators RENAME COLUMN formation_id TO accompagnement_id;

-- ═══ Bloc 1b : occuper le nom libere ═════════════════════════════════

ALTER TABLE events                      RENAME TO formations;
ALTER TABLE event_registrations         RENAME TO formation_registrations;
ALTER TABLE recurring_event_definitions RENAME TO recurring_formation_definitions;

ALTER TABLE formation_registrations    RENAME COLUMN event_id        TO formation_id;
ALTER TABLE scheduled_workflow_actions RENAME COLUMN anchor_event_id TO anchor_formation_id;

-- Les contraintes, index, sequences et valeurs par defaut referencent ces
-- objets par OID : ils suivent le renommage sans intervention. C'est aussi
-- vrai de l'index unique partiel idx_swa_no_duplicate, qui designe
-- anchor_event_id par numero d'attribut.

-- ═══ Bloc 2 : noms de contraintes ════════════════════════════════════
--
-- Trois de ces noms ne sont PAS cosmetiques : le code les cite en dur dans
-- ses `select` PostgREST pour desambiguiser une jointure
-- (`consultants!accompagnements_consultant_id_fkey (...)`). Les oublier
-- casse la requete a l'execution, sans erreur de compilation.

ALTER TABLE accompagnements
  RENAME CONSTRAINT formations_consultant_id_fkey TO accompagnements_consultant_id_fkey;
ALTER TABLE accompagnement_enrollments
  RENAME CONSTRAINT formation_enrollments_client_id_fkey TO accompagnement_enrollments_client_id_fkey;
ALTER TABLE accompagnement_collaborators
  RENAME CONSTRAINT formation_collaborators_consultant_id_fkey TO accompagnement_collaborators_consultant_id_fkey;

-- Cosmetiques, pour qu'un \d reste lisible.
ALTER TABLE formation_registrations
  RENAME CONSTRAINT event_registrations_client_id_fkey TO formation_registrations_client_id_fkey;
ALTER TABLE formations
  RENAME CONSTRAINT valid_event_range TO valid_formation_range;

-- ═══ Bloc 3 : noms de policies ═══════════════════════════════════════
--
-- Les policies survivent au renommage sans intervention : leurs expressions
-- USING et WITH CHECK sont stockees en arbre analyse (pg_node_tree) dont les
-- references aux tables sont des OID. Seuls leurs noms deviennent trompeurs.

ALTER POLICY events_select_published  ON formations RENAME TO formations_select_published;
ALTER POLICY events_select_own        ON formations RENAME TO formations_select_own;
ALTER POLICY events_select_admin      ON formations RENAME TO formations_select_admin;
ALTER POLICY events_insert_consultant ON formations RENAME TO formations_insert_consultant;
ALTER POLICY events_update_own        ON formations RENAME TO formations_update_own;
ALTER POLICY events_update_admin      ON formations RENAME TO formations_update_admin;

ALTER POLICY event_reg_select_client     ON formation_registrations RENAME TO formation_reg_select_client;
ALTER POLICY event_reg_select_consultant ON formation_registrations RENAME TO formation_reg_select_consultant;
ALTER POLICY event_reg_select_admin      ON formation_registrations RENAME TO formation_reg_select_admin;
ALTER POLICY event_reg_insert_client     ON formation_registrations RENAME TO formation_reg_insert_client;

ALTER POLICY recurring_event_defs_select ON recurring_formation_definitions RENAME TO recurring_formation_defs_select;
ALTER POLICY recurring_event_defs_insert ON recurring_formation_definitions RENAME TO recurring_formation_defs_insert;
ALTER POLICY recurring_event_defs_update ON recurring_formation_definitions RENAME TO recurring_formation_defs_update;
ALTER POLICY recurring_event_defs_delete ON recurring_formation_definitions RENAME TO recurring_formation_defs_delete;

ALTER POLICY formations_select_published  ON accompagnements RENAME TO accompagnements_select_published;
ALTER POLICY formations_select_own        ON accompagnements RENAME TO accompagnements_select_own;
ALTER POLICY formations_select_collab     ON accompagnements RENAME TO accompagnements_select_collab;
ALTER POLICY formations_select_admin      ON accompagnements RENAME TO accompagnements_select_admin;
ALTER POLICY formations_insert_consultant ON accompagnements RENAME TO accompagnements_insert_consultant;
ALTER POLICY formations_update_own        ON accompagnements RENAME TO accompagnements_update_own;
ALTER POLICY formations_update_collab     ON accompagnements RENAME TO accompagnements_update_collab;
ALTER POLICY formations_update_admin      ON accompagnements RENAME TO accompagnements_update_admin;
ALTER POLICY formations_delete_own        ON accompagnements RENAME TO accompagnements_delete_own;

ALTER POLICY formation_collab_select ON accompagnement_collaborators RENAME TO accompagnement_collab_select;
ALTER POLICY formation_collab_insert ON accompagnement_collaborators RENAME TO accompagnement_collab_insert;
ALTER POLICY formation_collab_delete ON accompagnement_collaborators RENAME TO accompagnement_collab_delete;

-- ═══ Bloc 4 : corps de fonctions ═════════════════════════════════════
--
-- Seul endroit ou le renommage ne se propage pas : pg_proc.prosrc stocke du
-- texte, jamais reanalyse.

-- get_formation_ids_owned_by lit « formations ». Apres le bloc 1b, ce nom
-- designe les formations professionnelles : les policies de
-- accompagnement_collaborators autoriseraient alors les mauvaises lignes.
-- Faille d'autorisation silencieuse si ce bloc est oublie.
ALTER FUNCTION public.get_formation_ids_owned_by(uuid)
  RENAME TO get_accompagnement_ids_owned_by;

CREATE OR REPLACE FUNCTION public.get_accompagnement_ids_owned_by(owner_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT id FROM accompagnements WHERE consultant_id = owner_id;
$$;

-- calculate_client_score lit deux tables renommees. Sans reecriture, elle
-- leve « relation does not exist » a chaque calcul de score CRM.
-- Seuls les noms changent : aucune valeur de la formule n'est touchee.
CREATE OR REPLACE FUNCTION calculate_client_score(
  p_client_id uuid,
  p_consultant_id uuid DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_completed_bookings   integer;
  v_total_spent_cents    bigint;
  v_accompagnements_count integer;
  v_formations_count     integer;
  v_last_activity        timestamptz;
  v_inactive_days        integer;
  v_score                numeric;
  v_recency_factor       numeric;
BEGIN
  -- Nombre de réservations complétées
  SELECT COUNT(*)
  INTO v_completed_bookings
  FROM bookings
  WHERE client_id = p_client_id
    AND status = 'completed'
    AND (p_consultant_id IS NULL OR consultant_id = p_consultant_id);

  -- Total dépensé (paiements réussis)
  SELECT COALESCE(SUM(amount_cents), 0)
  INTO v_total_spent_cents
  FROM payments
  WHERE client_id = p_client_id
    AND status = 'succeeded'
    AND (p_consultant_id IS NULL OR consultant_id = p_consultant_id);

  -- Nombre d'accompagnements achetés
  SELECT COUNT(*)
  INTO v_accompagnements_count
  FROM accompagnement_enrollments
  WHERE client_id = p_client_id;

  -- Nombre de formations suivies
  SELECT COUNT(*)
  INTO v_formations_count
  FROM formation_registrations
  WHERE client_id = p_client_id
    AND status = 'confirmed';

  -- Dernière activité (max de toutes les interactions)
  SELECT GREATEST(
    MAX(b.starts_at),
    MAX(ae.enrolled_at),
    MAX(fr.registered_at)
  )
  INTO v_last_activity
  FROM profiles p
  LEFT JOIN bookings b ON b.client_id = p.id
    AND b.status = 'completed'
    AND (p_consultant_id IS NULL OR b.consultant_id = p_consultant_id)
  LEFT JOIN accompagnement_enrollments ae ON ae.client_id = p.id
  LEFT JOIN formation_registrations fr ON fr.client_id = p.id
    AND fr.status = 'confirmed'
  WHERE p.id = p_client_id;

  -- Jours d'inactivité
  v_inactive_days := COALESCE(
    EXTRACT(DAY FROM (now() - v_last_activity))::integer,
    9999
  );

  -- Calcul du score brut (max théorique = 100)
  v_score :=
    LEAST(40, v_completed_bookings * 15) +           -- fidélité consultations
    LEAST(25, v_total_spent_cents::numeric / 4000) + -- valeur financière
    LEAST(20, v_accompagnements_count * 10) +        -- engagement accompagnements
    LEAST(15, v_formations_count * 5);               -- engagement formations

  -- Malus récence
  IF v_inactive_days >= 180 THEN
    v_recency_factor := 0.5;
  ELSIF v_inactive_days >= 90 THEN
    v_recency_factor := 0.75;
  ELSE
    v_recency_factor := 1.0;
  END IF;

  v_score := v_score * v_recency_factor;

  RETURN LEAST(100, GREATEST(0, v_score::integer));
END;
$$;

COMMENT ON FUNCTION calculate_client_score IS 'Calcule un score 0-100 pour un client. p_consultant_id optionnel pour filtrer par consultante.';

-- ═══ Bloc 5 : types enumeres ═════════════════════════════════════════
--
-- Renommer un type ou une valeur ne reecrit aucune ligne : les colonnes
-- referencent le type par OID, les valeurs sont stockees par numero d'ordre.
-- Instantane meme sur une grosse table.
--
-- ALTER TYPE ... RENAME VALUE refuse un nom deja pris : l'ordre compte ici
-- comme partout ailleurs dans cette migration.

ALTER TYPE formation_status RENAME TO accompagnement_status;
ALTER TYPE event_type       RENAME TO formation_type;

ALTER TYPE payment_type RENAME VALUE 'formation' TO 'accompagnement';
ALTER TYPE payment_type RENAME VALUE 'event'     TO 'formation';

ALTER TYPE promo_trigger_type RENAME VALUE 'formation_purchase' TO 'accompagnement_purchase';
ALTER TYPE promo_trigger_type RENAME VALUE 'event_purchase'     TO 'formation_purchase';

ALTER TYPE promo_target_type RENAME VALUE 'formations_all' TO 'accompagnements_all';
ALTER TYPE promo_target_type RENAME VALUE 'events_all'     TO 'formations_all';
ALTER TYPE promo_target_type RENAME VALUE 'formation'      TO 'accompagnement';
ALTER TYPE promo_target_type RENAME VALUE 'event'          TO 'formation';

-- La contrainte promo_targets_id_matches_type cite ces valeurs, mais les
-- resout en OID a l'analyse : elle suit le renommage sans intervention.

-- ═══ Bloc 6 : discriminants d'automatisations ════════════════════════
--
-- Premier bloc qui modifie des lignes. A partir d'ici, le rollback demande
-- les UPDATE inverses, pas un renommage.
--
-- ROLLBACK (a executer manuellement, dans l'ordre inverse) :
--   UPDATE admin_workflows SET trigger_type = 'recurring_event'  WHERE trigger_type = 'recurring_formation';
--   UPDATE admin_workflows SET trigger_type = 'formation_enrolled' WHERE trigger_type = 'accompagnement_enrolled';
--   UPDATE automations SET trigger_type = 'delay_after_event' WHERE trigger_type = 'delay_after_formation';
--   UPDATE automations SET trigger_type = 'event_registered'  WHERE trigger_type = 'formation_registered';
--   UPDATE automations SET trigger_type = 'formation_purchased' WHERE trigger_type = 'accompagnement_purchased';
--
-- admin_workflow_steps.action_type ne porte aucun de ces discriminants
-- (send_email, add_label, webhook) et n'est pas touche.

UPDATE automations SET trigger_type = 'accompagnement_purchased' WHERE trigger_type = 'formation_purchased';
UPDATE automations SET trigger_type = 'formation_registered'     WHERE trigger_type = 'event_registered';
UPDATE automations SET trigger_type = 'delay_after_formation'    WHERE trigger_type = 'delay_after_event';

UPDATE admin_workflows SET trigger_type = 'accompagnement_enrolled' WHERE trigger_type = 'formation_enrolled';
UPDATE admin_workflows SET trigger_type = 'recurring_formation'     WHERE trigger_type = 'recurring_event';

-- ═══ Bloc 7 : cles de configuration en JSONB ═════════════════════════
--
-- Meme echange circulaire, a l'interieur du JSON : formation_ids doit
-- liberer la place avant qu'event_ids ne l'occupe.

UPDATE automations
SET trigger_config = (trigger_config - 'formation_ids')
                     || jsonb_build_object('accompagnement_ids', trigger_config -> 'formation_ids')
WHERE trigger_config ? 'formation_ids';

UPDATE automations
SET trigger_config = (trigger_config - 'event_ids')
                     || jsonb_build_object('formation_ids', trigger_config -> 'event_ids')
WHERE trigger_config ? 'event_ids';

UPDATE admin_workflows
SET trigger_config = (trigger_config - 'formation_ids')
                     || jsonb_build_object('accompagnement_ids', trigger_config -> 'formation_ids')
WHERE trigger_config ? 'formation_ids';

UPDATE labels
SET auto_assign_rule = (auto_assign_rule - 'formation_ids')
                       || jsonb_build_object('accompagnement_ids', auto_assign_rule -> 'formation_ids')
WHERE auto_assign_rule ? 'formation_ids';

UPDATE labels
SET auto_assign_rule = jsonb_set(auto_assign_rule, '{trigger}', '"accompagnement_enrolled"')
WHERE auto_assign_rule ->> 'trigger' = 'formation_enrolled';

-- ═══ Bloc 8 : variables de fusion des emails ═════════════════════════
--
-- Ces marqueurs vivent dans du HTML redige a la main en back-office. Les
-- colonnes jsonb passent par ::text puis reviennent en ::jsonb, ce qui
-- atteint le HTML imbrique du block editor sans parcourir l'arbre.
-- replace(NULL, ...) renvoie NULL : une colonne vide reste vide.
--
-- Meme ordre impose : les trois formation_* liberent la place avant que les
-- quatre event_* ne l'occupent.

UPDATE email_templates SET name = 'accompagnement_access' WHERE name = 'formation_access';

UPDATE email_templates SET
  subject     = replace(replace(subject, '{{formation_title}}', '{{accompagnement_title}}'),
                        '{{formation_url}}', '{{accompagnement_url}}'),
  body_html   = replace(replace(body_html, '{{formation_title}}', '{{accompagnement_title}}'),
                        '{{formation_url}}', '{{accompagnement_url}}'),
  body_design = replace(replace(body_design::text, '{{formation_title}}', '{{accompagnement_title}}'),
                        '{{formation_url}}', '{{accompagnement_url}}')::jsonb,
  variables   = replace(replace(variables::text, '"formation_title"', '"accompagnement_title"'),
                        '"formation_url"', '"accompagnement_url"')::jsonb;

UPDATE email_templates SET
  subject     = replace(replace(replace(replace(subject,
                  '{{event_title}}', '{{formation_title}}'),
                  '{{event_date}}', '{{formation_date}}'),
                  '{{event_time}}', '{{formation_time}}'),
                  '{{event_location}}', '{{formation_location}}'),
  body_html   = replace(replace(replace(replace(body_html,
                  '{{event_title}}', '{{formation_title}}'),
                  '{{event_date}}', '{{formation_date}}'),
                  '{{event_time}}', '{{formation_time}}'),
                  '{{event_location}}', '{{formation_location}}'),
  body_design = replace(replace(replace(replace(body_design::text,
                  '{{event_title}}', '{{formation_title}}'),
                  '{{event_date}}', '{{formation_date}}'),
                  '{{event_time}}', '{{formation_time}}'),
                  '{{event_location}}', '{{formation_location}}')::jsonb,
  variables   = replace(replace(replace(replace(variables::text,
                  '"event_title"', '"formation_title"'),
                  '"event_date"', '"formation_date"'),
                  '"event_time"', '"formation_time"'),
                  '"event_location"', '"formation_location"')::jsonb;

UPDATE email_campaigns SET
  subject     = replace(replace(subject, '{{formation_title}}', '{{accompagnement_title}}'),
                        '{{formation_url}}', '{{accompagnement_url}}'),
  body_html   = replace(replace(body_html, '{{formation_title}}', '{{accompagnement_title}}'),
                        '{{formation_url}}', '{{accompagnement_url}}'),
  body_design = replace(replace(body_design::text, '{{formation_title}}', '{{accompagnement_title}}'),
                        '{{formation_url}}', '{{accompagnement_url}}')::jsonb;

UPDATE email_campaigns SET
  subject     = replace(replace(replace(replace(subject,
                  '{{event_title}}', '{{formation_title}}'),
                  '{{event_date}}', '{{formation_date}}'),
                  '{{event_time}}', '{{formation_time}}'),
                  '{{event_location}}', '{{formation_location}}'),
  body_html   = replace(replace(replace(replace(body_html,
                  '{{event_title}}', '{{formation_title}}'),
                  '{{event_date}}', '{{formation_date}}'),
                  '{{event_time}}', '{{formation_time}}'),
                  '{{event_location}}', '{{formation_location}}'),
  body_design = replace(replace(replace(replace(body_design::text,
                  '{{event_title}}', '{{formation_title}}'),
                  '{{event_date}}', '{{formation_date}}'),
                  '{{event_time}}', '{{formation_time}}'),
                  '{{event_location}}', '{{formation_location}}')::jsonb;

UPDATE admin_workflow_steps SET
  action_config = replace(replace(action_config::text,
                    '{{formation_title}}', '{{accompagnement_title}}'),
                    '{{formation_url}}', '{{accompagnement_url}}')::jsonb;

UPDATE admin_workflow_steps SET
  action_config = replace(replace(replace(replace(action_config::text,
                    '{{event_title}}', '{{formation_title}}'),
                    '{{event_date}}', '{{formation_date}}'),
                    '{{event_time}}', '{{formation_time}}'),
                    '{{event_location}}', '{{formation_location}}')::jsonb;

UPDATE automations SET
  actions = replace(replace(actions::text,
              '{{formation_title}}', '{{accompagnement_title}}'),
              '{{formation_url}}', '{{accompagnement_url}}')::jsonb;

UPDATE automations SET
  actions = replace(replace(replace(replace(actions::text,
              '{{event_title}}', '{{formation_title}}'),
              '{{event_date}}', '{{formation_date}}'),
              '{{event_time}}', '{{formation_time}}'),
              '{{event_location}}', '{{formation_location}}')::jsonb;

-- ═══ Bloc 9 : autres valeurs metier stockees ═════════════════════════

-- Conditions de segments CRM : [{"field":"formation_count","op":">=","value":2}]
UPDATE crm_segments
SET conditions = replace(conditions::text, '"formation_count"', '"accompagnement_count"')::jsonb
WHERE conditions::text LIKE '%"formation_count"%';

UPDATE crm_segments
SET conditions = replace(conditions::text, '"event_count"', '"formation_count"')::jsonb
WHERE conditions::text LIKE '%"event_count"%';

COMMENT ON COLUMN crm_segments.conditions IS 'Tableau de conditions : [{"field":"booking_count","op":">=","value":3}]. Champs : booking_count, total_spent_cents, accompagnement_count, formation_count, inactive_days, days_since_registration';

-- Registre des renonciations au droit de retractation. Seule la categorie
-- change ; accepted_text, qui porte le contenu juridiquement opposable,
-- n'est pas touche. Le code lit WITHDRAWAL_TEXTS[context] : laisser des
-- lignes en 'formation' renverrait undefined a l'affichage.
UPDATE withdrawal_waivers SET context = 'accompagnement' WHERE context = 'formation';

-- Journal d'audit : les inscriptions manuelles a un accompagnement.
UPDATE audit_logs
SET action = 'admin_manual_accompagnement_enrollment'
WHERE action = 'admin_manual_formation_enrollment';

UPDATE audit_logs
SET action = 'admin_manual_accompagnement_unenrollment'
WHERE action = 'admin_manual_formation_unenrollment';

UPDATE audit_logs
SET entity_type = 'accompagnement_enrollments'
WHERE entity_type = 'formation_enrollments';

-- Les noms de buckets Storage ('formations', 'accompagnements') ne sont
-- volontairement PAS renommes : ils sont incrustes dans chaque URL publique
-- deja stockee en base. Les changer invaliderait tous les fichiers en ligne.

COMMIT;
