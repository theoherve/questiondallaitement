-- Facturation — encaissement sur place.
--
-- Un paiement sur place n'a pas d'identifiant Stripe : rien n'empechait donc,
-- cote base, d'enregistrer deux fois le meme encaissement (double clic sur
-- « marquer comme encaisse »), ce qui produirait deux paiements et deux
-- factures pour une seule prestation — un trou dans la comptabilite.
--
-- Cet index unique partiel garantit au plus un paiement manuel (sans PI Stripe)
-- par vente. Les paiements en ligne portent un payment_intent, donc en sont
-- exclus : leur idempotence est deja assuree par l'unicite de cet identifiant.
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_manual_once
  ON payments (reference_id, type)
  WHERE stripe_payment_intent_id IS NULL;
