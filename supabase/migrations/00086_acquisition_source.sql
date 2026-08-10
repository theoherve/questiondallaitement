-- Provenance d'une inscription.
--
-- Complete les libelles CRM poses a la main : ceux-ci portent le jugement
-- humain, celle-ci enregistre un fait au moment ou il se produit. Sans elle,
-- « les inscrites venues d'Instagram » se reconstitue de memoire.
--
-- Nullable, et elle le restera pour beaucoup de comptes : la valeur n'existe
-- que si l'inscription portait un parametre de provenance, et le chemin
-- « connexion avec Google » ne peut pas la transmettre (le callback signIn
-- rattache un profil sans voir la page d'origine).
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS acquisition_source TEXT;

CREATE INDEX IF NOT EXISTS idx_profiles_acquisition_source
  ON profiles(acquisition_source) WHERE acquisition_source IS NOT NULL;
