-- Facturation (2/3) — emission automatique et numerotation.
--
-- La facture est emise par la consultante a chaque achat en ligne confirme.
-- Deux exigences legales dictent la conception :
--
--   1. numerotation sequentielle, sans trou ni doublon, propre a chaque
--      emettrice et remise a zero chaque mois (format AAAA-MM-NNNN) ;
--   2. immuabilite : une facture emise ne se modifie pas — une correction
--      passe par un avoir (PR 3/3). D'ou l'absence de politique UPDATE/DELETE
--      et le snapshot fige de l'identite de l'emettrice.
--
-- L'atomicite de la numerotation est le point delicat : deux redeliveries
-- Stripe simultanees ne doivent jamais recevoir le meme numero, ni en bruler
-- un si l'une echoue. Meme solution que le limiteur de debit (00050) : tout se
-- joue dans une seule transaction, compteur verrouille (voir create_invoice).

-- Compteur par (consultante, annee, mois). Le numero visible derive de
-- last_number ; la remise a zero mensuelle est implicite dans la cle.
CREATE TABLE IF NOT EXISTS invoice_sequences (
  consultant_id UUID NOT NULL REFERENCES consultants(id),
  year INT NOT NULL,
  month INT NOT NULL,
  last_number INT NOT NULL DEFAULT 0,
  PRIMARY KEY (consultant_id, year, month)
);

ALTER TABLE invoice_sequences ENABLE ROW LEVEL SECURITY;
-- Aucune politique : seul le service role (fonction SECURITY DEFINER) y touche.

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Un paiement confirme donne exactement une facture. La contrainte d'unicite
  -- rend l'emission idempotente face aux redeliveries Stripe.
  payment_id UUID NOT NULL UNIQUE REFERENCES payments(id),
  consultant_id UUID NOT NULL REFERENCES consultants(id),
  client_id UUID NOT NULL REFERENCES profiles(id),

  type payment_type NOT NULL,
  reference_id UUID NOT NULL,

  -- Identite du numero, allouee atomiquement.
  number TEXT NOT NULL,
  year INT NOT NULL,
  month INT NOT NULL,
  sequence INT NOT NULL,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- La numerotation etant propre a chaque emettrice, l'unicite l'est aussi.
  UNIQUE (consultant_id, number),

  currency TEXT NOT NULL DEFAULT 'eur',
  vat_rate NUMERIC(5, 2) NOT NULL,
  amount_ttc_cents INT NOT NULL,
  amount_ht_cents INT NOT NULL,
  amount_vat_cents INT NOT NULL,

  description TEXT NOT NULL,
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL,

  -- Snapshot fige de l'emettrice au moment de l'emission (immuabilite).
  issuer_legal_name TEXT NOT NULL,
  issuer_address TEXT NOT NULL,
  issuer_siren TEXT NOT NULL,
  issuer_vat_number TEXT NOT NULL,
  issuer_legal_form TEXT,

  status TEXT NOT NULL DEFAULT 'issued'
    CHECK (status IN ('issued', 'cancelled')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoices_consultant ON invoices (consultant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client ON invoices (client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_payment ON invoices (payment_id);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Lecture seule pour les parties concernees ; aucune politique d'ecriture :
-- l'insertion passe par la fonction SECURITY DEFINER, jamais par un client.
CREATE POLICY invoices_select_consultant ON invoices
  FOR SELECT USING (consultant_id = auth.uid());

CREATE POLICY invoices_select_client ON invoices
  FOR SELECT USING (client_id = auth.uid());

CREATE POLICY invoices_select_admin ON invoices
  FOR SELECT USING (is_admin());

/**
 * Emet la facture d'un paiement, ou renvoie celle deja emise.
 *
 * Tout tient dans une seule transaction, donc dans un seul verrou de sequence :
 *   - si une facture existe deja pour ce paiement, on la renvoie (idempotence
 *     face aux redeliveries) sans consommer de numero ;
 *   - sinon on incremente le compteur du mois, on formate le numero et on
 *     insere. Si deux appels concurrents passent le test d'existence, la
 *     contrainte UNIQUE(payment_id) fait echouer le second : sa transaction est
 *     annulee, donc l'increment du compteur aussi — aucun trou.
 *
 * Le contenu (montants, snapshot emettrice, parties) est fourni en jsonb par
 * l'appelant ; la fonction n'ajoute que l'identite du numero et l'emission.
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
  SELECT * INTO v_row FROM invoices WHERE payment_id = v_payment_id;
  IF FOUND THEN
    RETURN to_jsonb(v_row);
  END IF;

  INSERT INTO invoice_sequences AS s (consultant_id, year, month, last_number)
  VALUES (v_consultant_id, v_year, v_month, 1)
  ON CONFLICT (consultant_id, year, month)
    DO UPDATE SET last_number = s.last_number + 1
  RETURNING s.last_number INTO v_seq;

  -- Meme format que formatInvoiceNumber (TS) : FM supprime les blancs, le
  -- masque impose un minimum de chiffres sans jamais tronquer au-dela.
  v_number := to_char(v_year, 'FM0000') || '-'
           || to_char(v_month, 'FM00') || '-'
           || to_char(v_seq, 'FM0000');

  INSERT INTO invoices (
    payment_id, consultant_id, client_id, type, reference_id,
    number, year, month, sequence, issued_at,
    currency, vat_rate, amount_ttc_cents, amount_ht_cents, amount_vat_cents,
    description, client_name, client_email,
    issuer_legal_name, issuer_address, issuer_siren, issuer_vat_number,
    issuer_legal_form, status
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
    COALESCE(p_content->>'status', 'issued')
  )
  RETURNING * INTO v_row;

  RETURN to_jsonb(v_row);
END;
$$;
