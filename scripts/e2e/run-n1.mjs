import { supabase, assertTestMode, APP_URL } from "./lib/env.mjs";
import {
  IDS,
  PI,
  PRICES,
  CLIENT_EMAIL,
  CONSULTANT_STRIPE_ACCOUNT,
  platformFee,
} from "./lib/fixtures.mjs";
import {
  buildEvent,
  postEvent,
  checkoutSession,
  paymentIntent,
  charge,
  account,
} from "./lib/stripe-events.mjs";
import { seed } from "./seed-test-data.mjs";
import { cleanup } from "./cleanup-test-data.mjs";

const results = [];

const test = async (name, fn) => {
  try {
    await fn();
    results.push({ name, ok: true });
    console.log(`  ✓ ${name}`);
  } catch (error) {
    results.push({ name, ok: false, error: error.message });
    console.log(`  ✗ ${name}\n      ${error.message}`);
  }
};

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const assertEqual = (actual, expected, label) => {
  if (actual !== expected) {
    throw new Error(`${label} : attendu ${expected}, recu ${actual}`);
  }
};

const one = async (table, column, value, select = "*") => {
  const { data, error } = await supabase
    .from(table)
    .select(select)
    .eq(column, value)
    .maybeSingle();
  if (error) throw new Error(`${table} : ${error.message}`);
  return data;
};

// --- Scenarios --------------------------------------------------------------

const scenarioFormation = async () => {
  const amount = PRICES.formation;
  const event = buildEvent(
    "checkout.session.completed",
    checkoutSession({
      paymentIntentId: PI.formation,
      amountTotal: amount,
      metadata: {
        type: "formation",
        reference_id: IDS.formation,
        client_id: IDS.clientProfile,
        consultant_id: IDS.consultantProfile,
        platform_fee_cents: platformFee(amount).toString(),
      },
    }),
  );

  const { status } = await postEvent(event);
  assertEqual(status, 200, "status webhook");

  const enrollment = await one(
    "formation_enrollments",
    "stripe_payment_intent_id",
    PI.formation,
  );
  assert(enrollment, "aucun formation_enrollments cree");
  assertEqual(enrollment.formation_id, IDS.formation, "formation_id");
  assertEqual(enrollment.client_id, IDS.clientProfile, "client_id");

  const payment = await one("payments", "stripe_payment_intent_id", PI.formation);
  assert(payment, "aucune ligne payments creee");
  assertEqual(payment.status, "succeeded", "payments.status");
  assertEqual(payment.type, "formation", "payments.type");
  assertEqual(payment.amount_cents, amount, "payments.amount_cents");
  assertEqual(
    payment.platform_fee_cents,
    platformFee(amount),
    "payments.platform_fee_cents",
  );
};

const scenarioBooking = async () => {
  const amount = PRICES.booking;
  const startsAt = new Date(Date.now() + 7 * 24 * 3600 * 1000);
  const endsAt = new Date(startsAt.getTime() + 60 * 60 * 1000);

  const event = buildEvent(
    "checkout.session.completed",
    checkoutSession({
      paymentIntentId: PI.booking,
      amountTotal: amount,
      metadata: {
        type: "booking",
        reference_id: IDS.booking,
        client_id: IDS.clientProfile,
        consultant_id: IDS.consultantProfile,
        consultation_type_id: IDS.consultationType,
        duration_option_id: IDS.durationOption,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        // "cabinet" and not "teleconsultation": avoids the Zoom call entirely.
        location: "cabinet",
        reason: "Test E2E N1",
        platform_fee_cents: platformFee(amount).toString(),
      },
    }),
  );

  const { status } = await postEvent(event);
  assertEqual(status, 200, "status webhook");

  const booking = await one("bookings", "id", IDS.booking);
  assert(booking, "aucun booking cree");
  assertEqual(booking.status, "confirmed", "bookings.status");
  assertEqual(booking.payment_method, "online", "bookings.payment_method");
  assertEqual(booking.location, "cabinet", "bookings.location");
  assertEqual(
    booking.stripe_payment_intent_id,
    PI.booking,
    "bookings.stripe_payment_intent_id",
  );

  const payment = await one("payments", "stripe_payment_intent_id", PI.booking);
  assert(payment, "aucune ligne payments creee");
  assertEqual(payment.type, "booking", "payments.type");
  assertEqual(payment.reference_id, IDS.booking, "payments.reference_id");
};

const scenarioEvent = async () => {
  const amount = PRICES.event;
  const event = buildEvent(
    "checkout.session.completed",
    checkoutSession({
      paymentIntentId: PI.event,
      amountTotal: amount,
      metadata: {
        type: "event",
        reference_id: IDS.event,
        client_id: IDS.clientProfile,
        consultant_id: IDS.consultantProfile,
        platform_fee_cents: platformFee(amount).toString(),
      },
    }),
  );

  const { status } = await postEvent(event);
  assertEqual(status, 200, "status webhook");

  const registration = await one(
    "event_registrations",
    "stripe_payment_intent_id",
    PI.event,
  );
  assert(registration, "aucune event_registrations creee");
  assertEqual(registration.status, "registered", "event_registrations.status");
};

const scenarioPaymentIntentSucceeded = async () => {
  // Force the row to "pending" so the handler has something to flip.
  const { error } = await supabase
    .from("payments")
    .update({ status: "pending" })
    .eq("stripe_payment_intent_id", PI.formation);
  if (error) throw new Error(`preparation : ${error.message}`);

  const event = buildEvent(
    "payment_intent.succeeded",
    paymentIntent({ id: PI.formation, amount: PRICES.formation }),
  );

  const { status } = await postEvent(event);
  assertEqual(status, 200, "status webhook");

  const payment = await one("payments", "stripe_payment_intent_id", PI.formation);
  assertEqual(payment.status, "succeeded", "payments.status");
};

/** Seeds a standalone payment row so refund scenarios do not disturb the others. */
const seedPaymentRow = async (paymentIntentId, amountCents, type, referenceId) => {
  const { error } = await supabase.from("payments").upsert(
    {
      stripe_payment_intent_id: paymentIntentId,
      client_id: IDS.clientProfile,
      consultant_id: IDS.consultantProfile,
      amount_cents: amountCents,
      platform_fee_cents: platformFee(amountCents),
      currency: "eur",
      type,
      reference_id: referenceId,
      status: "succeeded",
    },
    { onConflict: "stripe_payment_intent_id" },
  );
  if (error) throw new Error(`preparation payments : ${error.message}`);
};

const scenarioRefundFull = async () => {
  const amount = PRICES.booking;
  await seedPaymentRow(PI.refundFull, amount, "booking", IDS.booking);

  const event = buildEvent(
    "charge.refunded",
    charge({
      paymentIntentId: PI.refundFull,
      amount,
      amountRefunded: amount,
    }),
  );

  const { status } = await postEvent(event);
  assertEqual(status, 200, "status webhook");

  const payment = await one("payments", "stripe_payment_intent_id", PI.refundFull);
  assertEqual(payment.status, "refunded", "payments.status");
  assertEqual(payment.refund_amount_cents, amount, "payments.refund_amount_cents");
  assert(payment.refunded_at, "refunded_at non renseigne");
};

const scenarioRefundPartial = async () => {
  const amount = PRICES.booking;
  const refunded = Math.round(amount / 2);
  await seedPaymentRow(PI.refundPartial, amount, "booking", IDS.booking);

  const event = buildEvent(
    "charge.refunded",
    charge({
      paymentIntentId: PI.refundPartial,
      amount,
      amountRefunded: refunded,
    }),
  );

  const { status } = await postEvent(event);
  assertEqual(status, 200, "status webhook");

  const payment = await one(
    "payments",
    "stripe_payment_intent_id",
    PI.refundPartial,
  );
  assertEqual(payment.status, "partially_refunded", "payments.status");
  assertEqual(
    payment.refund_amount_cents,
    refunded,
    "payments.refund_amount_cents",
  );
};

const scenarioAccountUpdated = async () => {
  // pending → charges disabled, details not submitted
  await postEvent(
    buildEvent(
      "account.updated",
      account({
        id: CONSULTANT_STRIPE_ACCOUNT,
        consultantId: IDS.consultantProfile,
        chargesEnabled: false,
        detailsSubmitted: false,
      }),
    ),
  );
  let consultant = await one("consultants", "id", IDS.consultantProfile);
  assertEqual(consultant.stripe_account_status, "pending", "statut initial");

  // details submitted but charges still off → pending_verification
  await postEvent(
    buildEvent(
      "account.updated",
      account({
        id: CONSULTANT_STRIPE_ACCOUNT,
        consultantId: IDS.consultantProfile,
        chargesEnabled: false,
        detailsSubmitted: true,
      }),
    ),
  );
  consultant = await one("consultants", "id", IDS.consultantProfile);
  assertEqual(
    consultant.stripe_account_status,
    "pending_verification",
    "statut apres soumission",
  );

  // charges enabled → active
  await postEvent(
    buildEvent(
      "account.updated",
      account({
        id: CONSULTANT_STRIPE_ACCOUNT,
        consultantId: IDS.consultantProfile,
        chargesEnabled: true,
        detailsSubmitted: true,
      }),
    ),
  );
  consultant = await one("consultants", "id", IDS.consultantProfile);
  assertEqual(consultant.stripe_account_status, "active", "statut final");
};

const scenarioInvalidSignature = async () => {
  const event = buildEvent(
    "checkout.session.completed",
    checkoutSession({
      paymentIntentId: "pi_e2e_should_not_exist",
      amountTotal: 1000,
      metadata: {
        type: "formation",
        reference_id: IDS.formation,
        client_id: IDS.clientProfile,
        consultant_id: IDS.consultantProfile,
      },
    }),
  );

  const { status } = await postEvent(event, { corruptSignature: true });
  assertEqual(status, 400, "status webhook (signature invalide)");

  const payment = await one(
    "payments",
    "stripe_payment_intent_id",
    "pi_e2e_should_not_exist",
  );
  assert(!payment, "une signature invalide a quand meme ecrit en base");
};

const scenarioWrongSecret = async () => {
  const event = buildEvent(
    "charge.refunded",
    charge({
      paymentIntentId: PI.refundFull,
      amount: PRICES.booking,
      amountRefunded: PRICES.booking,
    }),
  );

  const { status } = await postEvent(event, { secret: "whsec_wrong_secret" });
  assertEqual(status, 400, "status webhook (mauvais secret)");
};

// --- Runner -----------------------------------------------------------------

const checkAppReachable = async () => {
  try {
    const response = await fetch(`${APP_URL}/api/health`);
    if (!response.ok) throw new Error(`status ${response.status}`);
  } catch (error) {
    throw new Error(
      `L'app ne repond pas sur ${APP_URL} (${error.message}). Lance \`pnpm dev\` avant.`,
    );
  }
};

const main = async () => {
  assertTestMode();

  console.log(`\nE2E N1 — webhooks Stripe simules (${APP_URL})\n`);
  await checkAppReachable();

  await cleanup();
  await seed();

  console.log("Scenarios :");
  await test("achat accompagnement → enrollment + payment", scenarioFormation);
  await test("reservation → booking confirme + payment", scenarioBooking);
  await test("inscription evenement → registration", scenarioEvent);
  await test("payment_intent.succeeded → payment succeeded", scenarioPaymentIntentSucceeded);
  await test("refund total → payment refunded", scenarioRefundFull);
  await test("refund partiel → payment partially_refunded", scenarioRefundPartial);
  await test("account.updated → statut Connect", scenarioAccountUpdated);
  await test("signature invalide → 400, rien en base", scenarioInvalidSignature);
  await test("mauvais secret webhook → 400", scenarioWrongSecret);

  if (!process.env.E2E_KEEP_DATA) {
    console.log("");
    await cleanup();
  }

  const failed = results.filter((r) => !r.ok);
  console.log(
    `\n${results.length - failed.length}/${results.length} scenarios passes.`,
  );

  if (failed.length) {
    console.log("\nEchecs :");
    for (const { name, error } of failed) console.log(`  - ${name} : ${error}`);
    process.exit(1);
  }
};

main().catch((error) => {
  console.error(`\nErreur fatale : ${error.message}`);
  process.exit(1);
});
