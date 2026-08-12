-- Cartes cadeaux : type de paiement, tables, RLS, et fonction de redemption.
--
-- Ajoute 'gift_card' a l'enum payment_type pour les factures Stripe, et elargit
-- la contrainte CHECK de invoice_settlements.method pour accepter ce moyen de
-- reglement. Les trois tables (gift_cards, gift_card_redemptions) et la fonction
-- redeem_gift_card() realisent l'emission, le suivi de solde, et la redemption
-- atomique d'une carte (verrouillage + validation + ledger + reglement).

ALTER TYPE payment_type ADD VALUE IF NOT EXISTS 'gift_card';

CREATE TYPE gift_card_type AS ENUM ('amount', 'service');
CREATE TYPE gift_card_status AS ENUM ('active', 'used', 'expired', 'cancelled');
CREATE TYPE gift_card_delivery_mode AS ENUM ('email', 'pdf');
CREATE TYPE gift_card_created_by AS ENUM ('purchase', 'manual');

CREATE TABLE gift_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  type gift_card_type NOT NULL,
  initial_amount_cents INT,
  consultation_type_id UUID REFERENCES consultation_types(id),
  consultant_id UUID NOT NULL REFERENCES consultants(id),
  buyer_name TEXT NOT NULL,
  buyer_email TEXT NOT NULL,
  beneficiary_name TEXT,
  beneficiary_email TEXT,
  personal_message TEXT,
  delivery_mode gift_card_delivery_mode NOT NULL,
  status gift_card_status NOT NULL DEFAULT 'active',
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  invoice_id UUID REFERENCES invoices(id),
  created_by gift_card_created_by NOT NULL,
  created_by_admin_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT gift_cards_amount_type_chk CHECK (
    (type = 'amount' AND initial_amount_cents IS NOT NULL AND consultation_type_id IS NULL)
    OR (type = 'service' AND initial_amount_cents IS NULL AND consultation_type_id IS NOT NULL)
  ),
  -- Une carte a 0 ou a montant negatif n'a aucun sens et casserait le calcul de
  -- solde (initial - SUM(redemptions)). NULL reste accepte : c'est le cas des
  -- cartes 'service', garde par la contrainte ci-dessus.
  CONSTRAINT gift_cards_initial_amount_positive_chk CHECK (initial_amount_cents > 0)
);

CREATE INDEX idx_gift_cards_code ON gift_cards(code);
CREATE INDEX idx_gift_cards_consultant ON gift_cards(consultant_id);

CREATE TABLE gift_card_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gift_card_id UUID NOT NULL REFERENCES gift_cards(id),
  amount_cents INT NOT NULL CHECK (amount_cents > 0),
  booking_id UUID REFERENCES bookings(id),
  invoice_id UUID REFERENCES invoices(id),
  recorded_by UUID NOT NULL REFERENCES profiles(id),
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_gift_card_redemptions_card ON gift_card_redemptions(gift_card_id);

ALTER TABLE gift_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE gift_card_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY gift_cards_select_consultant ON gift_cards
  FOR SELECT USING (consultant_id = auth.uid());

CREATE POLICY gift_cards_select_admin ON gift_cards
  FOR SELECT USING (is_admin());

CREATE POLICY gift_card_redemptions_select_consultant ON gift_card_redemptions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM gift_cards
      WHERE gift_cards.id = gift_card_redemptions.gift_card_id
        AND gift_cards.consultant_id = auth.uid()
    )
  );

CREATE POLICY gift_card_redemptions_select_admin ON gift_card_redemptions
  FOR SELECT USING (is_admin());

-- Elargit le mode de reglement existant (00099) pour accepter une carte
-- cadeau comme moyen de solder une facture, sans dupliquer la logique de
-- statut deja calculee par le trigger invoice_settlements_recompute_status.
ALTER TABLE invoice_settlements DROP CONSTRAINT IF EXISTS invoice_settlements_method_check;
ALTER TABLE invoice_settlements ADD CONSTRAINT invoice_settlements_method_check
  CHECK (method IN ('cash', 'check', 'transfer', 'gift_card'));

-- Redemption atomique : verrouille la carte, verifie statut/expiration/solde,
-- ecrit la ligne de ledger, et si un invoice_id est fourni, ecrit aussi le
-- reglement correspondant pour que le solde du reutilise le calcul existant.
CREATE OR REPLACE FUNCTION redeem_gift_card(
  p_code TEXT,
  p_amount_cents INT,
  p_booking_id UUID DEFAULT NULL,
  p_invoice_id UUID DEFAULT NULL,
  p_recorded_by UUID DEFAULT NULL
) RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_card gift_cards%ROWTYPE;
  v_used_cents INT;
  v_balance_cents INT;
  v_redemption gift_card_redemptions%ROWTYPE;
BEGIN
  IF p_amount_cents <= 0 THEN
    RAISE EXCEPTION 'invalid_amount';
  END IF;

  SELECT * INTO v_card FROM gift_cards WHERE code = p_code FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'gift_card_not_found';
  END IF;

  IF v_card.status != 'active' THEN
    RAISE EXCEPTION 'gift_card_not_active';
  END IF;

  IF v_card.expires_at < now() THEN
    RAISE EXCEPTION 'gift_card_expired';
  END IF;

  -- Defense en profondeur : meme appelee par du code serveur, la fonction ne
  -- doit jamais solder la facture d'une autre consultante avec cette carte.
  -- Sans ce controle, un appelant compromis (ou une erreur de plomberie) suffit
  -- a transferer la valeur d'une carte vers une facture qui n'a rien a voir.
  IF p_invoice_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = p_invoice_id
        AND invoices.consultant_id = v_card.consultant_id
    ) THEN
      RAISE EXCEPTION 'invoice_consultant_mismatch';
    END IF;
  END IF;

  IF v_card.type = 'service' THEN
    IF EXISTS (SELECT 1 FROM gift_card_redemptions WHERE gift_card_id = v_card.id) THEN
      RAISE EXCEPTION 'gift_card_already_used';
    END IF;

    INSERT INTO gift_card_redemptions (gift_card_id, amount_cents, booking_id, invoice_id, recorded_by)
    VALUES (v_card.id, p_amount_cents, p_booking_id, p_invoice_id, p_recorded_by)
    RETURNING * INTO v_redemption;

    UPDATE gift_cards SET status = 'used' WHERE id = v_card.id;
  ELSE
    SELECT COALESCE(SUM(amount_cents), 0) INTO v_used_cents
    FROM gift_card_redemptions WHERE gift_card_id = v_card.id;

    v_balance_cents := v_card.initial_amount_cents - v_used_cents;

    IF v_balance_cents < p_amount_cents THEN
      RAISE EXCEPTION 'gift_card_insufficient_balance';
    END IF;

    INSERT INTO gift_card_redemptions (gift_card_id, amount_cents, booking_id, invoice_id, recorded_by)
    VALUES (v_card.id, p_amount_cents, p_booking_id, p_invoice_id, p_recorded_by)
    RETURNING * INTO v_redemption;

    IF v_balance_cents - p_amount_cents <= 0 THEN
      UPDATE gift_cards SET status = 'used' WHERE id = v_card.id;
    END IF;
  END IF;

  IF p_invoice_id IS NOT NULL THEN
    INSERT INTO invoice_settlements (invoice_id, method, amount_cents, paid_at, note, recorded_by)
    VALUES (p_invoice_id, 'gift_card', p_amount_cents, now(), 'Carte cadeau ' || v_card.code, p_recorded_by);
  END IF;

  RETURN to_jsonb(v_redemption);
END;
$$;

-- Cette fonction est SECURITY DEFINER : elle contourne RLS et ecrit un
-- reglement sur la facture qu'on lui passe. Exposee via PostgREST, la cle
-- publique `anon` permettrait a quiconque detenant UN code de carte valide de
-- solder n'importe quelle facture du systeme, au nom de n'importe quel profil.
-- Seul le code serveur (client service-role) doit pouvoir l'appeler.
REVOKE EXECUTE ON FUNCTION redeem_gift_card(TEXT, INT, UUID, UUID, UUID)
  FROM PUBLIC, anon, authenticated;
