-- Identite de facturation par consultante (docs/FACTURATION.md).
--
-- La facture est emise par la consultante : son en-tete porte ces mentions,
-- toutes obligatoires. Une consultante ne peut donc pas facturer — ni vendre
-- en ligne — tant qu'elles ne sont pas renseignees.
--
-- Sur la fiche `consultants` plutot que dans une table a part : la relation est
-- 1:1 et toujours necessaire, comme `is_platform_owner` (00051).

ALTER TABLE consultants
  ADD COLUMN IF NOT EXISTS billing_legal_name TEXT,
  ADD COLUMN IF NOT EXISTS billing_address TEXT,
  ADD COLUMN IF NOT EXISTS billing_siren TEXT,
  ADD COLUMN IF NOT EXISTS billing_vat_number TEXT,
  -- Optionnel : forme juridique / mention capital, selon le statut.
  ADD COLUMN IF NOT EXISTS billing_legal_form TEXT;

-- Carole HERVÉ. Le numero de TVA a ete fourni ; le SIREN en est extrait
-- (FR + cle 94 + SIREN 540075819, cle de controle verifiee). La raison sociale
-- et l'adresse restent a saisir par la consultante depuis son espace : sans
-- elles, le profil reste incomplet et la vente en ligne bloquee, ce qui est le
-- comportement voulu avant le live.
UPDATE consultants
SET billing_vat_number = 'FR94540075819',
    billing_siren = '540075819'
WHERE id = '31b9a2da-c1ee-4a71-9c41-055b60bbd22a';
