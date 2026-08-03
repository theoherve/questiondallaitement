-- Jeton de desinscription de la newsletter.
--
-- L'email de bienvenue part desormais par Resend, avec un template edite dans
-- l'administration du site. Le lien de desinscription automatique de Brevo
-- n'existe donc pas dans cet envoi, alors qu'il est obligatoire. Il faut le
-- fabriquer.
--
-- Un jeton opaque plutot que l'adresse en clair dans l'URL : un lien
-- `?email=...` permettrait de desinscrire n'importe qui en devinant son
-- adresse, et laisserait cette adresse dans les journaux de tout serveur
-- traverse.
ALTER TABLE newsletter_subscribers
  ADD COLUMN IF NOT EXISTS unsubscribe_token UUID NOT NULL DEFAULT gen_random_uuid();

CREATE UNIQUE INDEX IF NOT EXISTS idx_newsletter_subscribers_unsubscribe_token
  ON newsletter_subscribers (unsubscribe_token);
