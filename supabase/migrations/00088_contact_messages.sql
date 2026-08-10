-- Formulaire de contact public — messages des visiteurs a destination de
-- l'administration.
--
-- Meme choix que newsletter_subscribers (00058) : aucune policy RLS pour anon.
-- L'insertion passe par la route API publique, qui utilise le client admin
-- (service role) apres honeypot + rate limit. Une policy anon ouvrirait la
-- table a l'ecriture directe depuis n'importe quel client, en contournant ces
-- deux garde-fous.

CREATE TABLE IF NOT EXISTS contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'nouveau'
    CHECK (status IN ('nouveau', 'lu', 'traite')),
  -- Rempli si le visiteur etait connecte au moment de l'envoi. Pas de
  -- contrainte NOT NULL : la majorite des envois viennent de visiteurs
  -- anonymes.
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sert la liste admin (tri par date, filtre par statut).
CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at
  ON contact_messages (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_messages_status
  ON contact_messages (status);

-- RLS activee sans policy : seul le service role lit/ecrit, exactement comme
-- newsletter_subscribers. Sans elle, la cle anon lirait l'integralite des
-- messages, adresses email comprises.
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;
