-- Facturation (3/3c) — correction par avoir.
--
-- Une facture emise est immuable : on ne la modifie pas, on emet un **avoir**
-- qui l'annule, puis une **facture corrigee**. Un meme paiement porte donc
-- desormais plusieurs documents (l'originale annulee, l'avoir, la corrigee),
-- ce qui oblige a revoir deux choses :
--
--   1. la distinction entre facture et avoir (`document_type`) et les liens de
--      correction ;
--   2. l'unicite `payment_id` : « au plus une facture par paiement » devient
--      « au plus une facture *active* par paiement » — l'avoir et les factures
--      annulees en sont exclus.

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS document_type TEXT NOT NULL DEFAULT 'invoice'
    CHECK (document_type IN ('invoice', 'credit_note')),
  -- Avoir → facture qu'il annule.
  ADD COLUMN IF NOT EXISTS corrects_invoice_id UUID REFERENCES invoices(id),
  -- Facture corrigee → facture qu'elle remplace.
  ADD COLUMN IF NOT EXISTS replaces_invoice_id UUID REFERENCES invoices(id);

-- L'unicite d'origine (une facture par paiement) empechait toute correction.
-- On la remplace par une unicite partielle : une seule facture *active*
-- (emise, hors avoir) par paiement. L'idempotence de l'emission automatique
-- reste donc garantie, tout en autorisant l'annulation-remplacement.
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_payment_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_active_per_payment
  ON invoices (payment_id)
  WHERE document_type = 'invoice' AND status = 'issued';

/**
 * Emet la facture d'un paiement, ou renvoie la facture active existante.
 *
 * Reecrite ici pour deux raisons : la recherche d'existence doit viser la
 * facture *active* (un paiement peut porter une originale annulee et un avoir),
 * et l'insertion doit poser explicitement `document_type = 'invoice'`. Le reste
 * est inchange — atomicite de la numerotation, cf. 00054.
 */
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
    issuer_legal_form, status, document_type
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
    'invoice'
  )
  RETURNING * INTO v_row;

  RETURN to_jsonb(v_row);
END;
$$;

/**
 * Corrige une facture emise : dans une seule transaction, emet l'avoir qui
 * l'annule, marque l'originale annulee, puis emet la facture corrigee.
 *
 * Trois numeros consecutifs sortent de la meme sequence mensuelle (avoir puis
 * corrigee), preservant une numerotation continue. L'avoir reprend a
 * l'identique le contenu de l'originale avec des montants negatifs ; la
 * corrigee reprend le contenu fourni (nouvelle designation, nouveau TTC deja
 * decompose en HT/TVA par l'appelant).
 *
 * L'autorisation (la facture appartient bien a la consultante) est faite par
 * l'action avant l'appel ; ici on verifie seulement que la cible est une
 * facture active, sans quoi corriger n'aurait pas de sens.
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
    issuer_legal_form, status, document_type, corrects_invoice_id
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
    'issued', 'credit_note', v_orig.id
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
    issuer_legal_form, status, document_type, replaces_invoice_id
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
    'issued', 'invoice', v_orig.id
  )
  RETURNING * INTO v_new;

  RETURN to_jsonb(v_new);
END;
$$;
