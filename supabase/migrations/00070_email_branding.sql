-- Migration 00070: identite visuelle des emails (logo + banniere pre-definis)
--
-- Un seul reglage JSONB dans platform_settings : logo d'en-tete, pied de page,
-- et banniere pre-definie inseree a la demande depuis l'editeur de blocs.
-- Les visuels sont stockes dans le bucket public `mails` (cf. 00041).

INSERT INTO platform_settings (key, value) VALUES (
  'email_branding',
  jsonb_build_object(
    'header_enabled', true,
    'logo_url', NULL,
    'logo_alt', 'Question d''Allaitement',
    'logo_width', 160,
    'header_background', '#fff8f6',
    'header_link_url', NULL,
    'footer_enabled', true,
    'footer_text', 'Question d''Allaitement — accompagnement en lactation par des consultantes IBCLC.',
    'banner_image_url', NULL,
    'banner_alt', '',
    'banner_title', '',
    'banner_text', '',
    'banner_cta_label', '',
    'banner_cta_url', NULL,
    'banner_background', '#f5ebe8'
  )
)
ON CONFLICT (key) DO NOTHING;
