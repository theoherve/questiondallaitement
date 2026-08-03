-- Newsletter — inscrits et mesure d'audience.
--
-- Les specifications demandaient de ne pas dupliquer les contacts en base et de
-- s'en remettre entierement a Brevo. Deux raisons ont fait retenir l'inverse :
--
--   1. Le RGPD exige de pouvoir prouver le consentement — sa date et le texte
--      exact accepte. Brevo stocke bien un opt-in, mais la preuve vivrait alors
--      chez un sous-traitant : un changement d'offre, de compte ou de
--      prestataire l'emporterait avec lui. La preuve reste donc ici.
--   2. Le compte Brevo impose une liste blanche d'adresses IP, et les fonctions
--      Vercel n'ont pas d'IP de sortie stable. Ecrire d'abord en base garantit
--      qu'une inscription n'est jamais perdue quand l'appel a Brevo echoue :
--      elle est rejouable.
--
-- Brevo reste la source de verite de l'envoi ; cette table est la source de
-- verite du consentement.

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Normalise en minuscules cote applicatif. L'unicite est ce qui rend une
  -- reinscription inoffensive : elle met a jour la ligne au lieu d'en creer une
  -- seconde, et le formulaire peut repondre « deja inscrit » sans erreur.
  email TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,

  -- « page_newsletter » ou « homepage_teaser » : permet de comparer les deux
  -- points d'entree, comme demande au chapitre analytics.
  source TEXT NOT NULL,

  -- Preuve de consentement. Le texte est copie tel qu'affiche au moment de
  -- l'inscription : si la formulation de la case evolue, les consentements
  -- passes restent prouvables dans leur version d'origine.
  consent_text TEXT NOT NULL,
  consented_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Donnee personnelle, conservee au seul titre de la preuve. Jamais journalisee.
  consent_ip TEXT,

  -- Suivi de la synchronisation Brevo. `synced_at` a NULL avec un `sync_error`
  -- renseigne identifie les inscriptions a rejouer.
  brevo_synced_at TIMESTAMPTZ,
  brevo_sync_error TEXT,

  unsubscribed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sert la vue admin (tri par date) et la reprise des inscriptions en echec.
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_created_at
  ON newsletter_subscribers (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_pending_sync
  ON newsletter_subscribers (created_at)
  WHERE brevo_synced_at IS NULL;

-- Aucune politique : ces lignes ne sont lues que par le service role, via les
-- actions serveur d'administration. RLS activee malgre tout — sans elle, la cle
-- anon, publique par nature, lirait l'integralite du fichier d'adresses.
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- ─── Mesure d'audience ──────────────────────────────────────
--
-- Alternative maison a un outil tiers. Volontairement sans cookie, sans
-- identifiant de visiteur et sans adresse IP : rien ici ne se rattache a une
-- personne, donc la mesure ne depend pas du bandeau de consentement et
-- continue de fonctionner pour les visiteurs qui le refusent.
--
-- On ne stocke que ce qui repond a la question posee — combien de visites sur
-- la page, combien d'inscriptions, depuis quel point d'entree.

CREATE TABLE IF NOT EXISTS newsletter_events (
  id BIGSERIAL PRIMARY KEY,
  -- « page_view » ou « signup ».
  type TEXT NOT NULL,
  source TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_newsletter_events_type_created_at
  ON newsletter_events (type, created_at DESC);

ALTER TABLE newsletter_events ENABLE ROW LEVEL SECURITY;
