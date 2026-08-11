-- Migration 00093: réglages supplémentaires de la page Paramètres admin
--
-- Quatre nouvelles clés JSONB dans platform_settings, même pattern que
-- email_branding (00070) et announcement_banner (00092) : expéditeur des
-- emails, email de contact public, réseaux sociaux, feature flags.

INSERT INTO platform_settings (key, value) VALUES (
  'email_sender',
  jsonb_build_object(
    'from_address', 'noreply@formation-allaitement.com',
    'from_name', 'Question d''Allaitement'
  )
)
ON CONFLICT (key) DO NOTHING;

INSERT INTO platform_settings (key, value) VALUES (
  'seo_defaults',
  jsonb_build_object(
    'contact_email', 'contact@questiondallaitement.fr'
  )
)
ON CONFLICT (key) DO NOTHING;

INSERT INTO platform_settings (key, value) VALUES (
  'social_links',
  jsonb_build_object(
    'instagram_url', 'https://www.instagram.com/carole.questiondallaitement/',
    'tiktok_url', 'https://www.tiktok.com/@carole_herve',
    'linkedin_url', 'https://www.linkedin.com/in/carole-herve-ibclc/'
  )
)
ON CONFLICT (key) DO NOTHING;

INSERT INTO platform_settings (key, value) VALUES (
  'feature_flags',
  jsonb_build_object(
    'booking_enabled', true
  )
)
ON CONFLICT (key) DO NOTHING;
