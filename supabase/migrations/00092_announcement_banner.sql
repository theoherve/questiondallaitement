-- Migration 00092: bandeau d'annonce temporaire
--
-- Un seul reglage JSONB dans platform_settings : message, lien optionnel,
-- fenetre de dates optionnelle. Meme pattern que email_branding (00070).

INSERT INTO platform_settings (key, value) VALUES (
  'announcement_banner',
  jsonb_build_object(
    'enabled', false,
    'message', '',
    'link_url', NULL,
    'link_label', '',
    'start_date', NULL,
    'end_date', NULL
  )
)
ON CONFLICT (key) DO NOTHING;
