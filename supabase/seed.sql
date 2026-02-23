-- Seed data for development

-- Default email templates
INSERT INTO email_templates (name, subject, body_html, type, variables) VALUES
  ('booking_confirmation', 'Confirmation de votre réservation', '<h1>Réservation confirmée</h1><p>Bonjour {{client_name}},</p><p>Votre consultation avec {{consultant_name}} est confirmée pour le {{date}} à {{time}}.</p>', 'transactional', '["client_name", "consultant_name", "date", "time"]'),
  ('booking_reminder', 'Rappel : votre consultation demain', '<h1>Rappel</h1><p>Bonjour {{client_name}},</p><p>Votre consultation avec {{consultant_name}} a lieu demain à {{time}}.</p>', 'transactional', '["client_name", "consultant_name", "time"]'),
  ('booking_cancelled', 'Annulation de votre réservation', '<h1>Réservation annulée</h1><p>Bonjour {{client_name}},</p><p>Votre consultation du {{date}} a été annulée. {{refund_info}}</p>', 'transactional', '["client_name", "date", "refund_info"]'),
  ('formation_access', 'Accès à votre formation', '<h1>Formation disponible</h1><p>Bonjour {{client_name}},</p><p>Vous avez maintenant accès à la formation "{{formation_title}}". Cliquez ci-dessous pour commencer.</p>', 'transactional', '["client_name", "formation_title"]'),
  ('welcome', 'Bienvenue sur Question d''Allaitement', '<h1>Bienvenue !</h1><p>Bonjour {{client_name}},</p><p>Nous sommes ravis de vous accueillir sur Question d''Allaitement.</p>', 'transactional', '["client_name"]');
