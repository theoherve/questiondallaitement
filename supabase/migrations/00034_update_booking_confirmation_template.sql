-- Update booking_confirmation email template to include Zoom link support
-- and improve HTML styling.
UPDATE email_templates
SET
  subject   = 'Confirmation de votre réservation — {{date}}',
  body_html = '<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#1a1a1a"><h1 style="font-size:22px;margin-bottom:8px;color:#A0283E">Réservation confirmée ✓</h1><p style="margin-bottom:24px">Bonjour {{client_name}},</p><p>Votre consultation avec <strong>{{consultant_name}}</strong> est confirmée :</p><table style="margin:20px 0;border-left:3px solid #A0283E;padding-left:16px"><tr><td style="padding:4px 0"><strong>📅 Date :</strong> {{date}}</td></tr><tr><td style="padding:4px 0"><strong>⏰ Heure :</strong> {{time}}</td></tr></table>{{zoom_block}}<p style="margin-top:32px;color:#666;font-size:14px">À bientôt,<br>L''équipe Question d''Allaitement</p></div>',
  variables = '["client_name", "consultant_name", "date", "time", "zoom_block"]'::jsonb
WHERE name = 'booking_confirmation';
