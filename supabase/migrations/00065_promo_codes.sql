-- Codes promo multi-services.
--
-- La verite vit ici, pas chez Stripe : la plateforme n'a pas de Product Stripe
-- (les sessions utilisent price_data inline), le prix d'un rendez-vous est
-- calcule a la volee, et la commission depend du montant. La remise est donc
-- appliquee avant l'appel a Stripe, qui ne recoit qu'un montant deja remise.

CREATE TYPE promo_discount_type AS ENUM ('percent', 'fixed_cents');

CREATE TYPE promo_target_type AS ENUM (
  'formations_all', 'events_all', 'bookings_all',
  'formation', 'event', 'booking_service'
);

CREATE TYPE promo_trigger_type AS ENUM ('event_purchase', 'formation_purchase');

CREATE TYPE promo_redemption_status AS ENUM ('pending', 'confirmed', 'cancelled');

CREATE TABLE promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  label TEXT,
  discount_type promo_discount_type NOT NULL,
  discount_value INT NOT NULL,
  scope_all BOOLEAN NOT NULL DEFAULT true,
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  max_redemptions INT,
  max_per_user INT NOT NULL DEFAULT 1,
  min_order_cents INT NOT NULL DEFAULT 0,
  trigger_delay_hours INT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT promo_codes_value_positive CHECK (discount_value > 0),
  CONSTRAINT promo_codes_percent_max CHECK (
    discount_type <> 'percent' OR discount_value <= 100
  ),
  CONSTRAINT promo_codes_window_ordered CHECK (
    valid_from IS NULL OR valid_until IS NULL OR valid_from < valid_until
  )
);

-- La saisie est insensible a la casse : l'unicite doit l'etre aussi, sinon
-- « flash24 » et « FLASH24 » cohabitent avec des quotas separes.
CREATE UNIQUE INDEX idx_promo_codes_code ON promo_codes (upper(code));

CREATE TABLE promo_code_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id UUID NOT NULL REFERENCES promo_codes(id) ON DELETE CASCADE,
  target_type promo_target_type NOT NULL,
  -- formation.id, event.id ou consultation_type_id selon target_type. Pas de
  -- cle etrangere : la colonne pointe vers trois tables differentes.
  target_id UUID,

  CONSTRAINT promo_targets_id_matches_type CHECK (
    (target_type IN ('formations_all', 'events_all', 'bookings_all')
      AND target_id IS NULL)
    OR (target_type IN ('formation', 'event', 'booking_service')
      AND target_id IS NOT NULL)
  )
);

CREATE INDEX idx_promo_targets_code ON promo_code_targets (promo_code_id);

-- Declencheur : le code n'est valable que dans les trigger_delay_hours qui
-- suivent un achat correspondant. target_id NULL = n'importe quel produit du
-- type. Sert a PREMIERSJOURS (48 h apres l'achat d'un evenement).
CREATE TABLE promo_code_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id UUID NOT NULL REFERENCES promo_codes(id) ON DELETE CASCADE,
  trigger_type promo_trigger_type NOT NULL,
  target_id UUID
);

CREATE INDEX idx_promo_triggers_code ON promo_code_triggers (promo_code_id);

CREATE TABLE promo_code_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id UUID NOT NULL REFERENCES promo_codes(id),
  profile_id UUID NOT NULL REFERENCES profiles(id),
  order_kind payment_type NOT NULL,
  reference_id UUID NOT NULL,

  -- Renseigne juste apres la creation de la session : l'identifiant n'existe
  -- pas encore au moment ou la reservation est posee.
  stripe_session_id TEXT UNIQUE,
  stripe_payment_intent_id TEXT,

  original_amount_cents INT NOT NULL,
  discount_cents INT NOT NULL,
  final_amount_cents INT NOT NULL,

  status promo_redemption_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_at TIMESTAMPTZ
);

CREATE INDEX idx_promo_redemptions_code ON promo_code_redemptions (promo_code_id);
CREATE INDEX idx_promo_redemptions_profile
  ON promo_code_redemptions (promo_code_id, profile_id);
CREATE INDEX idx_promo_redemptions_status
  ON promo_code_redemptions (status, created_at);

ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_code_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_code_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_code_redemptions ENABLE ROW LEVEL SECURITY;

-- Aucune politique de lecture publique sur la configuration : exposer le
-- catalogue permettrait de lister les codes actifs depuis la console du
-- navigateur. Tout passe par le service role (server actions).
CREATE POLICY promo_codes_admin ON promo_codes
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY promo_targets_admin ON promo_code_targets
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY promo_triggers_admin ON promo_code_triggers
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY promo_redemptions_admin ON promo_code_redemptions
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY promo_redemptions_select_own ON promo_code_redemptions
  FOR SELECT USING (profile_id = auth.uid());

CREATE TRIGGER promo_codes_updated_at
  BEFORE UPDATE ON promo_codes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── Report sur les paiements et les factures ───────────────────────────

ALTER TABLE payments
  ADD COLUMN promo_code_id UUID REFERENCES promo_codes(id),
  ADD COLUMN discount_cents INT,
  ADD COLUMN original_amount_cents INT;

-- amount_cents reste le montant reellement encaisse : aucune lecture
-- existante ne change de sens.

ALTER TABLE invoices
  ADD COLUMN promo_code TEXT,
  ADD COLUMN discount_cents INT,
  ADD COLUMN gross_amount_ttc_cents INT;

-- create_invoice recopie explicitement chaque colonne : les trois nouvelles
-- doivent y etre ajoutees, sinon la remise n'atteint jamais la facture.
CREATE OR REPLACE FUNCTION create_invoice(p_content JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment_id UUID := (p_content->>'payment_id')::UUID;
  v_consultant_id UUID := (p_content->>'consultant_id')::UUID;
  v_now TIMESTAMPTZ := now();
  v_year INT := EXTRACT(YEAR FROM v_now);
  v_month INT := EXTRACT(MONTH FROM v_now);
  v_seq INT;
  v_number TEXT;
  v_row invoices;
BEGIN
  SELECT * INTO v_row FROM invoices
  WHERE payment_id = v_payment_id
    AND document_type = 'invoice'
    AND status = 'issued';
  IF FOUND THEN
    RETURN to_jsonb(v_row);
  END IF;

  INSERT INTO invoice_sequences AS s (consultant_id, year, month, last_number)
  VALUES (v_consultant_id, v_year, v_month, 1)
  ON CONFLICT (consultant_id, year, month)
    DO UPDATE SET last_number = s.last_number + 1
  RETURNING s.last_number INTO v_seq;

  v_number := to_char(v_year, 'FM0000') || '-'
           || to_char(v_month, 'FM00') || '-'
           || to_char(v_seq, 'FM0000');

  INSERT INTO invoices (
    payment_id, consultant_id, client_id, type, reference_id,
    number, year, month, sequence, issued_at,
    currency, vat_rate, amount_ttc_cents, amount_ht_cents, amount_vat_cents,
    description, client_name, client_email,
    issuer_legal_name, issuer_address, issuer_siren, issuer_vat_number,
    issuer_legal_form, status, document_type,
    promo_code, discount_cents, gross_amount_ttc_cents
  ) VALUES (
    v_payment_id,
    v_consultant_id,
    (p_content->>'client_id')::UUID,
    (p_content->>'type')::payment_type,
    (p_content->>'reference_id')::UUID,
    v_number, v_year, v_month, v_seq, v_now,
    p_content->>'currency',
    (p_content->>'vat_rate')::NUMERIC,
    (p_content->>'amount_ttc_cents')::INT,
    (p_content->>'amount_ht_cents')::INT,
    (p_content->>'amount_vat_cents')::INT,
    p_content->>'description',
    p_content->>'client_name',
    p_content->>'client_email',
    p_content->>'issuer_legal_name',
    p_content->>'issuer_address',
    p_content->>'issuer_siren',
    p_content->>'issuer_vat_number',
    p_content->>'issuer_legal_form',
    COALESCE(p_content->>'status', 'issued'),
    'invoice',
    p_content->>'promo_code',
    (p_content->>'discount_cents')::INT,
    (p_content->>'gross_amount_ttc_cents')::INT
  )
  RETURNING * INTO v_row;

  RETURN to_jsonb(v_row);
END;
$$;
