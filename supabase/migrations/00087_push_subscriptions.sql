-- Abonnements au push navigateur.
--
-- Une ligne par NAVIGATEUR, pas par personne : la meme cliente peut s'abonner
-- depuis son telephone et depuis son ordinateur, et les deux doivent sonner.
-- L'endpoint est l'identifiant que le navigateur fournit ; il est unique, et
-- c'est lui qui sert de cle de conflit a l'enregistrement.
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  -- Les deux cles de chiffrement fournies par le navigateur. Sans elles, la
  -- charge utile ne peut pas etre chiffree, donc pas envoyee.
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  -- Pour que l'utilisatrice reconnaisse ses appareils dans la liste.
  user_agent TEXT,
  last_success_at TIMESTAMPTZ,
  failure_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id
  ON push_subscriptions(user_id);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Lecture et suppression de ses propres appareils : la liste des appareils et
-- le bouton de retrait passent par une session. L'ecriture reste au role
-- service, comme pour les preferences : c'est une server action qui enregistre.
DROP POLICY IF EXISTS push_subscriptions_select_own ON push_subscriptions;
CREATE POLICY push_subscriptions_select_own ON push_subscriptions
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS push_subscriptions_delete_own ON push_subscriptions;
CREATE POLICY push_subscriptions_delete_own ON push_subscriptions
  FOR DELETE USING (user_id = auth.uid());

-- Le push devient un troisieme canal du modele de preferences existant. La
-- contrainte posee en 00085 n'admettait que deux valeurs : sans cette
-- reecriture, enregistrer une preference de push echouerait en base.
ALTER TABLE notification_preferences
  DROP CONSTRAINT IF EXISTS notification_preferences_channel_check;

ALTER TABLE notification_preferences
  ADD CONSTRAINT notification_preferences_channel_check
  CHECK (channel IN ('in_app', 'email', 'push'));
