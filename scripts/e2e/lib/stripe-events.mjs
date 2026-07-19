import { createHmac, randomUUID } from "node:crypto";
import { APP_URL, WEBHOOK_SECRET } from "./env.mjs";

const WEBHOOK_PATH = "/api/webhooks/stripe";

/**
 * Build the `Stripe-Signature` header the same way Stripe does:
 *   t=<unix_ts>,v1=<hmac_sha256(`${t}.${payload}`, secret)>
 */
export const signPayload = (payload, secret = WEBHOOK_SECRET, timestamp) => {
  const t = timestamp ?? Math.floor(Date.now() / 1000);
  const signature = createHmac("sha256", secret)
    .update(`${t}.${payload}`, "utf8")
    .digest("hex");
  return `t=${t},v1=${signature}`;
};

/** Wrap an object in the Stripe event envelope. */
export const buildEvent = (type, object) => ({
  id: `evt_e2e_${randomUUID().replace(/-/g, "").slice(0, 20)}`,
  object: "event",
  api_version: "2024-06-20",
  created: Math.floor(Date.now() / 1000),
  livemode: false,
  type,
  data: { object },
});

/**
 * POST a signed event to the running app.
 * Returns { status, body } — never throws on a non-2xx, so tests can assert on it.
 */
export const postEvent = async (event, { secret, corruptSignature } = {}) => {
  const payload = JSON.stringify(event);
  let signature = signPayload(payload, secret);

  if (corruptSignature) {
    signature = signature.replace(/v1=[0-9a-f]+/, `v1=${"0".repeat(64)}`);
  }

  const response = await fetch(`${APP_URL}${WEBHOOK_PATH}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Stripe-Signature": signature,
    },
    body: payload,
  });

  let body;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  return { status: response.status, body };
};

// --- Event object factories -------------------------------------------------

export const checkoutSession = ({
  paymentIntentId,
  amountTotal,
  metadata,
  currency = "eur",
}) => ({
  id: `cs_e2e_${randomUUID().replace(/-/g, "").slice(0, 20)}`,
  object: "checkout.session",
  payment_intent: paymentIntentId,
  amount_total: amountTotal,
  currency,
  payment_status: "paid",
  status: "complete",
  mode: "payment",
  metadata,
});

export const paymentIntent = ({ id, amount, currency = "eur" }) => ({
  id,
  object: "payment_intent",
  amount,
  currency,
  status: "succeeded",
});

export const charge = ({
  paymentIntentId,
  amount,
  amountRefunded,
  currency = "eur",
}) => ({
  id: `ch_e2e_${randomUUID().replace(/-/g, "").slice(0, 20)}`,
  object: "charge",
  payment_intent: paymentIntentId,
  amount,
  amount_refunded: amountRefunded,
  currency,
  refunded: amountRefunded >= amount,
  status: "succeeded",
});

export const account = ({
  id,
  consultantId,
  chargesEnabled,
  detailsSubmitted,
}) => ({
  id,
  object: "account",
  charges_enabled: chargesEnabled,
  payouts_enabled: chargesEnabled,
  details_submitted: detailsSubmitted,
  metadata: { consultant_id: consultantId },
});
