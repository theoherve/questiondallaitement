-- Add columns to profiles for Wix contact migration
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS language TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS street TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS job_title TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS wix_contact_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS wix_product_names TEXT[];

-- Index on wix_contact_id for dedup during migration
CREATE INDEX IF NOT EXISTS idx_profiles_wix_contact_id
  ON profiles(wix_contact_id) WHERE wix_contact_id IS NOT NULL;

-- Seed "Import à vérifier" label for flagging imported profiles needing manual review
INSERT INTO labels (name, slug, color)
SELECT 'Import à vérifier', 'import-a-verifier', '#F59E0B'
WHERE NOT EXISTS (SELECT 1 FROM labels WHERE slug = 'import-a-verifier');

-- Insert migration welcome email template (only if not already present)
INSERT INTO email_templates (id, name, subject, body_html, body_design)
SELECT
  gen_random_uuid(),
  'migration_welcome',
  'Votre espace Question d''Allaitement a migré',
  '<h1>Bienvenue sur votre nouvel espace</h1>
<p>Bonjour {{client_name}},</p>
<p>Votre compte Question d''Allaitement a été transféré vers notre nouvelle plateforme.</p>
<p>Pour accéder à votre espace personnel, il vous suffit de définir votre mot de passe en cliquant sur le bouton ci-dessous :</p>
<p><a href="{{setup_url}}" style="display:inline-block;padding:12px 24px;background-color:#A0283E;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">Activer mon compte</a></p>
<p>Ce lien est valide pendant 72 heures. Passé ce délai, vous pourrez en demander un nouveau depuis la page de connexion en cliquant sur « Mot de passe oublié ».</p>
<p>Si vous avez des questions, n''hésitez pas à nous contacter.</p>
<p>À très bientôt,<br>L''équipe Question d''Allaitement</p>',
  NULL
WHERE NOT EXISTS (
  SELECT 1 FROM email_templates WHERE name = 'migration_welcome'
);
