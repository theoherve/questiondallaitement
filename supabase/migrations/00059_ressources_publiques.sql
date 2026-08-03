-- Bucket « ressources » — fichiers publics liés depuis les emails.
--
-- Aucun emplacement existant ne convenait. `downloads` accepte bien les PDF et
-- les supports de presentation, mais il est prive : l'espace client le sert par
-- URL signee, valable une heure. Un lien de ce type dans un email de bienvenue
-- serait mort avant d'etre clique. `mails`, le seul bucket public, refuse les
-- PDF au niveau de la base — il ne porte que les images des emails.
--
-- D'ou un bucket dedie plutot qu'une ouverture de `downloads` : ce dernier
-- contient les ressources reservees aux accompagnements payes, et le rendre
-- public les exposerait a quiconque connait leur URL.
--
-- Lecture publique, ecriture reservee a l'admin. Les fichiers deposes ici sont
-- destines a etre diffuses — memo offert a l'inscription, article de presse,
-- support de presentation.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('ressources', 'ressources', true, 52428800, NULL)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "ressources_public_read" ON storage.objects;
CREATE POLICY "ressources_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'ressources');

DROP POLICY IF EXISTS "ressources_admin_insert" ON storage.objects;
CREATE POLICY "ressources_admin_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'ressources'
    AND (is_admin() OR auth.role() = 'service_role')
  );

DROP POLICY IF EXISTS "ressources_admin_update" ON storage.objects;
CREATE POLICY "ressources_admin_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'ressources'
    AND (is_admin() OR auth.role() = 'service_role')
  );

DROP POLICY IF EXISTS "ressources_admin_delete" ON storage.objects;
CREATE POLICY "ressources_admin_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'ressources'
    AND (is_admin() OR auth.role() = 'service_role')
  );

-- URL du memo offert a l'inscription.
--
-- En base plutot qu'en variable d'environnement : le cahier des charges demande
-- que Carole puisse remplacer le fichier sans nouveau deploiement. Vide au
-- depart — le lien de telechargement est simplement absent de l'email de
-- bienvenue tant que le fichier n'a pas ete depose.
INSERT INTO platform_settings (key, value) VALUES
  ('newsletter_memo_url', '""')
ON CONFLICT (key) DO NOTHING;

-- Suivi de l'email de bienvenue.
--
-- L'envoi part de notre route plutot que d'une automatisation Brevo : l'editeur
-- d'automatisation n'offre pas de piece jointe, et surtout l'envoi depuis le
-- code est testable et rejouable. En contrepartie il faut savoir ce qui est
-- parti — d'ou ces deux colonnes, lues par la vue d'administration.
ALTER TABLE newsletter_subscribers
  ADD COLUMN IF NOT EXISTS welcome_email_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS welcome_email_error TEXT;
