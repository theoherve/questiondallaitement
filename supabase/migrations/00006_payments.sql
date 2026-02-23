-- Payments: single source of truth for all financial transactions
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_payment_intent_id TEXT UNIQUE,
  stripe_charge_id TEXT,
  client_id UUID NOT NULL REFERENCES profiles(id),
  consultant_id UUID NOT NULL REFERENCES consultants(id),
  amount_cents INT NOT NULL,
  platform_fee_cents INT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'eur',
  type payment_type NOT NULL,
  reference_id UUID NOT NULL,
  status payment_status NOT NULL DEFAULT 'pending',
  refund_amount_cents INT NOT NULL DEFAULT 0,
  refunded_at TIMESTAMPTZ,
  stripe_invoice_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payments_client ON payments(client_id);
CREATE INDEX idx_payments_consultant ON payments(consultant_id);
CREATE INDEX idx_payments_stripe_pi ON payments(stripe_payment_intent_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_type ON payments(type);
CREATE INDEX idx_payments_reference ON payments(reference_id);

CREATE TRIGGER payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
