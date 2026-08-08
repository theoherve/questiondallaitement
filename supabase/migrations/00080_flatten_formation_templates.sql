-- Aplatit les fiches partagées : chaque session porte désormais son propre
-- contenu éditorial.
--
-- Les fiches (migration 00076) évitaient de répéter le même programme sur les
-- 88 dates des « Indispensables », au prix d'un écran d'administration séparé
-- et d'un contenu invisible depuis le formulaire d'une session. L'arbitrage a
-- été fait dans l'autre sens : une session, un texte, éditable là où on le
-- lit. Corriger une formation demande maintenant de reprendre chacune de ses
-- dates.
--
-- La copie ne remplit que les colonnes vides : une session qui avait déjà
-- amendé son programme garde sa version.

UPDATE formations f
SET
  summary_html = COALESCE(NULLIF(f.summary_html, ''), t.summary_html),
  objectives_html = COALESCE(NULLIF(f.objectives_html, ''), t.objectives_html),
  program_html = COALESCE(NULLIF(f.program_html, ''), t.program_html),
  audience_html = COALESCE(NULLIF(f.audience_html, ''), t.audience_html),
  external_url = COALESCE(NULLIF(f.external_url, ''), t.external_url),
  badge = COALESCE(NULLIF(f.badge, ''), t.badge),
  updated_at = NOW()
FROM formation_templates t
WHERE f.template_id = t.id;

-- Le rattachement n'a plus de lecteur : le laisser renseigné laisserait croire
-- qu'un héritage subsiste.
UPDATE formations SET template_id = NULL WHERE template_id IS NOT NULL;

ALTER TABLE formations DROP COLUMN IF EXISTS template_id;

DROP TABLE IF EXISTS formation_templates;
