const API = "https://api.stripe.com/v1";

const secretKey = () => {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY manquante");
  return key;
};

export type CheckoutSession = {
  id: string;
  amount_total: number;
  currency: string;
  customer_email: string | null;
  metadata: Record<string, string>;
  payment_intent: string | null;
  payment_status: string;
  status: string;
};

/** Extracts the `cs_test_…` id from a Checkout URL. */
export const sessionIdFromUrl = (url: string): string => {
  const match = url.match(/\/(cs_test_[A-Za-z0-9]+)/);
  if (!match) throw new Error(`Pas d'id de session Checkout dans : ${url}`);
  return match[1];
};

export const getCheckoutSession = async (id: string): Promise<CheckoutSession> => {
  const res = await fetch(`${API}/checkout/sessions/${id}`, {
    headers: { Authorization: `Bearer ${secretKey()}` },
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`Stripe: ${body.error?.message ?? res.status}`);
  return body;
};

/**
 * Reads the PaymentIntent parameters Checkout will use.
 *
 * `payment_intent` stays null until the session is completed, so the money
 * routing (destination account, platform fee) has to be read from the session's
 * expanded payment_intent_data instead.
 */
export const getSessionPaymentConfig = async (id: string) => {
  const res = await fetch(
    `${API}/checkout/sessions/${id}?expand[]=payment_intent`,
    { headers: { Authorization: `Bearer ${secretKey()}` } },
  );
  const body = await res.json();
  if (!res.ok) throw new Error(`Stripe: ${body.error?.message ?? res.status}`);
  return body;
};
