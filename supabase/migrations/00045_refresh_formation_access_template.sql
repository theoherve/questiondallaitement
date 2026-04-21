-- Refresh the formation_access transactional email so it matches the site
-- brand (Primary Red #a0283e, Primary Green #203634, Beige-Dark #f5ebe8).
--
-- The previous migration (00044) set a minimal inline body_html without
-- updating body_design. Since the renderer prefers body_design when it has a
-- `type` field and falls back to body_html otherwise, DBs where body_design
-- was NULL rendered the minimal version. We clear body_design here so the
-- renderer consistently uses the new brand-styled body_html below.
--
-- Admins can later reshape this in the block editor; saving a design from
-- the UI will repopulate body_design.

UPDATE email_templates
SET
  subject = 'Votre accompagnement « {{formation_title}} » est disponible',
  body_design = NULL,
  body_html = '<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Votre accompagnement est disponible</title></head><body style="margin:0;padding:0;background-color:#fff8f6;font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',Roboto,''Helvetica Neue'',Arial,sans-serif;color:#203634;line-height:1.6;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">Votre accès à {{formation_title}} est activé — rendez-vous dans votre espace personnel.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#fff8f6;padding:24px 12px;"><tr><td align="center">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(32,54,52,0.06);">

    <tr><td style="background-color:#203634;padding:24px;text-align:center;">
      <h1 style="margin:0;color:#ffffff;font-family:Georgia,''Times New Roman'',serif;font-size:20px;font-weight:700;letter-spacing:0.3px;">Question d''Allaitement</h1>
    </td></tr>

    <tr><td style="padding:40px 32px 8px;text-align:center;">
      <h2 style="margin:0 0 8px;color:#a0283e;font-family:Georgia,''Times New Roman'',serif;font-size:26px;font-weight:700;line-height:1.3;">Votre accompagnement est disponible</h2>
      <p style="margin:0;color:#5a6b69;font-size:14px;font-style:italic;">Un nouvel espace vient d''être ouvert pour vous.</p>
    </td></tr>

    <tr><td style="padding:24px 32px 0;">
      <p style="margin:0 0 16px;color:#203634;font-size:16px;">Bonjour {{client_name}},</p>
      <p style="margin:0 0 24px;color:#203634;font-size:16px;">Nous sommes ravies de vous accueillir. Votre accès est activé — vous pouvez dès maintenant retrouver l''ensemble du contenu dans votre espace personnel.</p>
    </td></tr>

    <tr><td style="padding:0 32px 24px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f5ebe8;border-radius:10px;">
        <tr><td style="padding:20px 24px;">
          <p style="margin:0;color:#203634;font-size:15px;"><strong style="color:#203634;">Votre accompagnement :</strong> <span style="font-weight:600;">{{formation_title}}</span></p>
        </td></tr>
      </table>
    </td></tr>

    <tr><td style="padding:0 32px 8px;">
      <p style="margin:0 0 12px;color:#203634;font-size:15px;font-weight:600;">Ce qui vous attend :</p>
      <p style="margin:0 0 6px;color:#203634;font-size:15px;">• Des vidéos et ressources accessibles à tout moment</p>
      <p style="margin:0 0 6px;color:#203634;font-size:15px;">• Une progression à votre rythme, sans limite de durée</p>
      <p style="margin:0 0 24px;color:#203634;font-size:15px;">• Le soutien bienveillant de consultantes IBCLC</p>
    </td></tr>

    <tr><td style="padding:8px 32px 16px;text-align:center;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;"><tr><td style="background-color:#a0283e;border-radius:8px;">
        <a href="{{access_url}}" role="button" style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;border-radius:8px;">J''accède à mon accompagnement</a>
      </td></tr></table>
    </td></tr>

    <tr><td style="padding:0 32px 24px;text-align:center;">
      <p style="margin:0;color:#5a6b69;font-size:13px;font-style:italic;">Si le bouton ne fonctionne pas, copiez ce lien : <a href="{{access_url}}" style="color:#a0283e;word-break:break-all;">{{access_url}}</a></p>
    </td></tr>

    <tr><td style="padding:0 32px 32px;">
      <p style="margin:0 0 20px;color:#203634;font-size:15px;">Une question, un doute ? Répondez directement à cet email, nous sommes à votre écoute.</p>
      <p style="margin:0;color:#203634;font-size:15px;text-align:center;">Avec douceur,<br><strong>L''équipe Question d''Allaitement</strong></p>
    </td></tr>

    <tr><td style="background-color:#fff8f6;padding:20px 24px;text-align:center;border-top:1px solid #f5ebe8;">
      <p style="margin:0 0 4px;color:#5a6b69;font-size:12px;">Accompagnement en lactation par des consultantes IBCLC.</p>
      <p style="margin:0;color:#5a6b69;font-size:12px;">© Question d''Allaitement — Tous droits réservés.</p>
    </td></tr>

  </table>
</td></tr></table>
</body></html>',
  variables = '["client_name", "formation_title", "access_url", "is_new_account"]'::jsonb
WHERE name = 'formation_access';
