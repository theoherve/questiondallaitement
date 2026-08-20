-- Template editable depuis l'admin (Marketing > Templates) pour l'annonce
-- hebdomadaire du blog envoyee aux abonnees de la newsletter.
--
-- `{{posts_block}}` est construit en code (une carte par article publie dans
-- la semaine, nombre variable) : ce n'est pas editable ici, comme
-- `{{zoom_block}}` ou `{{memo_block}}` pour les autres templates. Le reste —
-- objet, salutation, texte d'intro — est libre.
INSERT INTO email_templates (name, subject, body_html, variables, type)
SELECT
  'newsletter_blog_digest',
  'Les nouveautés du blog cette semaine',
  '<p style="margin:0 0 4px 0;font-size:12px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:#a0283e;">Cette semaine sur le blog</p>
<h1 style="margin:0 0 16px 0;font-family:Georgia,''Times New Roman'',serif;font-size:28px;line-height:34px;color:#203634;">Bonjour {{first_name}},</h1>
<p style="margin:0 0 28px 0;color:#5a6b69;">Chaque lundi, le ou les nouveaux articles publiés sur le blog la semaine passée.</p>
{{posts_block}}
<p style="margin:32px 0 0 0;font-size:12px;color:#888;">{{unsubscribe_link}}</p>',
  '["first_name", "posts_block", "unsubscribe_link"]'::jsonb,
  'marketing'
WHERE NOT EXISTS (
  SELECT 1 FROM email_templates WHERE name = 'newsletter_blog_digest'
);
