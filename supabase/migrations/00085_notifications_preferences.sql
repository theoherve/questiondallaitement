-- Preferences de notification, ciblage et desinscription.
--
-- La table ne stocke que les ECARTS au defaut : le defaut vit dans le code
-- (src/lib/notifications/preference-categories.ts). Stocker une ligne par
-- utilisatrice et par categorie imposerait un backfill a chaque nouvelle
-- categorie, et ferait demarrer tout nouvel evenement desactive pour les
-- comptes existants — l'inverse de ce qu'on veut.

CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  -- Cle de categorie visible par l'utilisatrice (rendez_vous, articles, ...),
  -- plus fine que la categorie technique portee par `notifications.category`.
  category_key TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('in_app', 'email')),
  enabled BOOLEAN NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, category_key, channel)
);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notification_preferences_select_own ON notification_preferences;
CREATE POLICY notification_preferences_select_own ON notification_preferences
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS notification_preferences_upsert_own ON notification_preferences;
CREATE POLICY notification_preferences_upsert_own ON notification_preferences
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Journal des envois cibles. Une erreur de condition sur un segment large,
-- c'est un envoi a toute la base : on veut pouvoir le constater apres coup
-- plutot que de le decouvrir par les reponses.
CREATE TABLE IF NOT EXISTS notification_broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event TEXT NOT NULL,
  rule JSONB NOT NULL,
  recipient_count INT NOT NULL,
  -- Vrai quand le plafond a coupe la liste : le compte ci-dessus est alors
  -- celui des destinataires REELLEMENT notifies, pas celui des resolus.
  truncated BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_broadcasts_created_at
  ON notification_broadcasts(created_at DESC);

ALTER TABLE notification_broadcasts ENABLE ROW LEVEL SECURITY;

-- Lecture reservee a l'administration ; ecriture par le role service seul.
DROP POLICY IF EXISTS notification_broadcasts_select_admin ON notification_broadcasts;
CREATE POLICY notification_broadcasts_select_admin ON notification_broadcasts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND roles && ARRAY['admin']::user_role[]
    )
  );

-- Desinscription depuis un email, donc sans session. Un jeton opaque plutot
-- que l'identifiant en clair, comme pour la newsletter (00060) : une URL
-- `?user=<uuid>` permettrait de desabonner autrui.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS notification_unsubscribe_token UUID NOT NULL DEFAULT gen_random_uuid();

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_notification_unsubscribe_token
  ON profiles(notification_unsubscribe_token);
