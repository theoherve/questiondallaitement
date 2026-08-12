-- Facturation manuelle + suivi de reglement (module 6 backlog Lacteo).
--
-- Une facture manuelle (virement/cheque/especes attendu) n'a ni paiement
-- Stripe ni reference a un booking/formation/event : payment_id, reference_id
-- et type deviennent nullables. `origin` distingue les deux provenances sans
-- toucher a l'enum payment_type (PostgreSQL interdit d'utiliser une valeur
-- d'enum tout juste ajoutee dans la meme transaction qui l'a creee, et chaque
-- fichier de migration ici s'execute comme une seule transaction).

ALTER TABLE invoices
  ALTER COLUMN payment_id DROP NOT NULL,
  ALTER COLUMN reference_id DROP NOT NULL,
  ALTER COLUMN type DROP NOT NULL,
  ADD COLUMN origin TEXT NOT NULL DEFAULT 'stripe'
    CHECK (origin IN ('stripe', 'manual')),
  ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid', 'partial', 'paid')),
  ADD COLUMN due_date TIMESTAMPTZ,
  -- Coordonnees de virement, snapshotees a l'emission comme les autres
  -- issuer_* : une facture manuelle en attente affiche les instructions de
  -- paiement telles qu'elles etaient au moment de l'emission.
  ADD COLUMN issuer_iban TEXT,
  ADD COLUMN issuer_bic TEXT;

-- Une facture Stripe est payee des l'emission (le paiement l'a precedee) :
-- corrige le defaut pour les lignes existantes et toutes les futures
-- factures automatiques, create_invoice fixera explicitement 'paid' aussi.
UPDATE invoices SET payment_status = 'paid' WHERE origin = 'stripe';

CREATE TABLE invoice_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id),
  method TEXT NOT NULL CHECK (method IN ('cash', 'check', 'transfer')),
  amount_cents INT NOT NULL CHECK (amount_cents > 0),
  paid_at TIMESTAMPTZ NOT NULL,
  note TEXT,
  recorded_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_invoice_settlements_invoice ON invoice_settlements(invoice_id);

ALTER TABLE invoice_settlements ENABLE ROW LEVEL SECURITY;

-- Lecture : la consultante proprietaire de la facture, ou l'admin. Pas de
-- policy INSERT/UPDATE/DELETE cote client : l'ecriture ne passe que par le
-- service role (server action recordSettlement), et un reglement mal saisi
-- se corrige par un reglement complementaire, jamais par une modification
-- silencieuse de l'historique financier.
CREATE POLICY invoice_settlements_select_consultant ON invoice_settlements
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_settlements.invoice_id
        AND invoices.consultant_id = auth.uid()
    )
  );

CREATE POLICY invoice_settlements_select_admin ON invoice_settlements
  FOR SELECT USING (is_admin());

-- Recalcule le statut de reglement de la facture a chaque reglement saisi.
CREATE OR REPLACE FUNCTION recompute_invoice_payment_status()
RETURNS TRIGGER AS $$
DECLARE
  v_total_settled INT;
  v_ttc INT;
BEGIN
  SELECT COALESCE(SUM(amount_cents), 0) INTO v_total_settled
  FROM invoice_settlements WHERE invoice_id = NEW.invoice_id;

  SELECT amount_ttc_cents INTO v_ttc
  FROM invoices WHERE id = NEW.invoice_id;

  UPDATE invoices
  SET payment_status = CASE
    WHEN v_total_settled >= v_ttc THEN 'paid'
    WHEN v_total_settled > 0 THEN 'partial'
    ELSE 'unpaid'
  END
  WHERE id = NEW.invoice_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER invoice_settlements_recompute_status
  AFTER INSERT ON invoice_settlements
  FOR EACH ROW
  EXECUTE FUNCTION recompute_invoice_payment_status();

-- Coordonnees pour un reglement par virement, affichees sur la facture
-- manuelle en attente. En clair : elles sont de toute facon imprimees en
-- clair sur le PDF envoye a la cliente, chiffrer la colonne ne protegerait
-- rien de reel.
ALTER TABLE consultants
  ADD COLUMN billing_iban TEXT,
  ADD COLUMN billing_bic TEXT;

/**
 * Emet une facture manuelle (hors paiement Stripe). Meme mecanique de
 * numerotation que create_invoice (00054) : sequence verrouillee par
 * (consultant_id, annee, mois), pour garantir la continuite legale entre
 * factures automatiques et manuelles.
 */
CREATE OR REPLACE FUNCTION create_manual_invoice(p_content JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_consultant_id UUID := (p_content->>'consultant_id')::UUID;
  v_now TIMESTAMPTZ := now();
  v_year INT := EXTRACT(YEAR FROM v_now);
  v_month INT := EXTRACT(MONTH FROM v_now);
  v_seq INT;
  v_number TEXT;
  v_row invoices;
BEGIN
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
    number, year, month, sequence, issued_at, due_date,
    currency, vat_rate, amount_ttc_cents, amount_ht_cents, amount_vat_cents,
    description, client_name, client_email,
    issuer_legal_name, issuer_address, issuer_siren, issuer_vat_number,
    issuer_legal_form, issuer_iban, issuer_bic, status, origin, payment_status
  ) VALUES (
    NULL,
    v_consultant_id,
    (p_content->>'client_id')::UUID,
    NULL,
    NULL,
    v_number, v_year, v_month, v_seq, v_now,
    (p_content->>'due_date')::TIMESTAMPTZ,
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
    p_content->>'issuer_iban',
    p_content->>'issuer_bic',
    'issued',
    'manual',
    'unpaid'
  )
  RETURNING * INTO v_row;

  RETURN to_jsonb(v_row);
END;
$$;

-- Mise a jour de create_invoice pour explicitement definir payment_status='paid'
-- et origin='stripe' lors de la creation des factures Stripe.
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
    promo_code, discount_cents, gross_amount_ttc_cents,
    origin, payment_status
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
    (p_content->>'gross_amount_ttc_cents')::INT,
    'stripe',
    'paid'
  )
  RETURNING * INTO v_row;

  RETURN to_jsonb(v_row);
END;
$$;

/**
 * Mise a jour de correct_invoice (00057) pour reprendre `origin` et
 * `payment_status` de la facture originale sur l'avoir et la corrigee.
 *
 * Sans ca, les deux documents retombaient sur les defauts de colonne
 * (origin='stripe', payment_status='unpaid') : corriger une facture manuelle
 * lui faisait perdre son affichage IBAN/reglement, et corriger une facture
 * Stripe deja payee produisait un avoir et une corrigee marques 'unpaid' —
 * faux pour l'export comptable. Le reste de la fonction est inchange.
 */
CREATE OR REPLACE FUNCTION correct_invoice(p_original_id UUID, p_content JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_orig invoices;
  v_now TIMESTAMPTZ := now();
  v_year INT := EXTRACT(YEAR FROM v_now);
  v_month INT := EXTRACT(MONTH FROM v_now);
  v_seq INT;
  v_number TEXT;
  v_new invoices;
BEGIN
  SELECT * INTO v_orig FROM invoices WHERE id = p_original_id FOR UPDATE;

  IF NOT FOUND OR v_orig.document_type <> 'invoice' OR v_orig.status <> 'issued' THEN
    RAISE EXCEPTION 'Facture introuvable ou non corrigeable';
  END IF;

  -- 1. Avoir : reprend l'originale, montants negatifs.
  INSERT INTO invoice_sequences AS s (consultant_id, year, month, last_number)
  VALUES (v_orig.consultant_id, v_year, v_month, 1)
  ON CONFLICT (consultant_id, year, month)
    DO UPDATE SET last_number = s.last_number + 1
  RETURNING s.last_number INTO v_seq;

  v_number := to_char(v_year, 'FM0000') || '-' || to_char(v_month, 'FM00')
           || '-' || to_char(v_seq, 'FM0000');

  INSERT INTO invoices (
    payment_id, consultant_id, client_id, type, reference_id,
    number, year, month, sequence, issued_at,
    currency, vat_rate,
    amount_ttc_cents, amount_ht_cents, amount_vat_cents,
    description, client_name, client_email,
    issuer_legal_name, issuer_address, issuer_siren, issuer_vat_number,
    issuer_legal_form, status, document_type, corrects_invoice_id,
    origin, payment_status, issuer_iban, issuer_bic, due_date
  ) VALUES (
    v_orig.payment_id, v_orig.consultant_id, v_orig.client_id, v_orig.type,
    v_orig.reference_id,
    v_number, v_year, v_month, v_seq, v_now,
    v_orig.currency, v_orig.vat_rate,
    -v_orig.amount_ttc_cents, -v_orig.amount_ht_cents, -v_orig.amount_vat_cents,
    'Avoir sur facture ' || v_orig.number,
    v_orig.client_name, v_orig.client_email,
    v_orig.issuer_legal_name, v_orig.issuer_address, v_orig.issuer_siren,
    v_orig.issuer_vat_number, v_orig.issuer_legal_form,
    'issued', 'credit_note', v_orig.id,
    v_orig.origin, v_orig.payment_status,
    v_orig.issuer_iban, v_orig.issuer_bic, v_orig.due_date
  );

  -- 2. Originale annulee (libere l'unicite partielle pour la corrigee).
  UPDATE invoices SET status = 'cancelled' WHERE id = v_orig.id;

  -- 3. Facture corrigee.
  INSERT INTO invoice_sequences AS s (consultant_id, year, month, last_number)
  VALUES (v_orig.consultant_id, v_year, v_month, 1)
  ON CONFLICT (consultant_id, year, month)
    DO UPDATE SET last_number = s.last_number + 1
  RETURNING s.last_number INTO v_seq;

  v_number := to_char(v_year, 'FM0000') || '-' || to_char(v_month, 'FM00')
           || '-' || to_char(v_seq, 'FM0000');

  INSERT INTO invoices (
    payment_id, consultant_id, client_id, type, reference_id,
    number, year, month, sequence, issued_at,
    currency, vat_rate,
    amount_ttc_cents, amount_ht_cents, amount_vat_cents,
    description, client_name, client_email,
    issuer_legal_name, issuer_address, issuer_siren, issuer_vat_number,
    issuer_legal_form, status, document_type, replaces_invoice_id,
    origin, payment_status, issuer_iban, issuer_bic, due_date
  ) VALUES (
    v_orig.payment_id, v_orig.consultant_id, v_orig.client_id, v_orig.type,
    v_orig.reference_id,
    v_number, v_year, v_month, v_seq, v_now,
    v_orig.currency,
    (p_content->>'vat_rate')::NUMERIC,
    (p_content->>'amount_ttc_cents')::INT,
    (p_content->>'amount_ht_cents')::INT,
    (p_content->>'amount_vat_cents')::INT,
    p_content->>'description',
    v_orig.client_name, v_orig.client_email,
    v_orig.issuer_legal_name, v_orig.issuer_address, v_orig.issuer_siren,
    v_orig.issuer_vat_number, v_orig.issuer_legal_form,
    'issued', 'invoice', v_orig.id,
    v_orig.origin, v_orig.payment_status,
    v_orig.issuer_iban, v_orig.issuer_bic, v_orig.due_date
  )
  RETURNING * INTO v_new;

  RETURN to_jsonb(v_new);
END;
$$;
