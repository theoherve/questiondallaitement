/**
 * Deterministic fixture IDs for the N1 suite.
 *
 * All IDs share the `e2e00000-0000-4000-8000-` prefix so they can be spotted
 * at a glance in the database and deleted wholesale by the cleanup script.
 */
const id = (suffix) => `e2e00000-0000-4000-8000-${suffix.padStart(12, "0")}`;

export const IDS = {
  clientProfile: id("100"),
  consultantProfile: id("200"),
  consultationType: id("300"),
  durationOption: id("310"),
  formation: id("400"),
  event: id("500"),
  // Reference IDs carried in Stripe metadata
  booking: id("600"),
};

export const PREFIX = "e2e00000-0000-4000-8000-";

export const CLIENT_EMAIL = "e2e-client@questiondallaitement.test";
export const CONSULTANT_EMAIL = "e2e-consultante@questiondallaitement.test";

/** Fake Connect account — never sent to Stripe, only stored in the DB. */
export const CONSULTANT_STRIPE_ACCOUNT = "acct_e2e_test_consultant";

export const COMMISSION_RATE = 15;

/** Payment intent IDs, one per scenario, so assertions never collide. */
export const PI = {
  formation: "pi_e2e_formation_0001",
  booking: "pi_e2e_booking_0001",
  event: "pi_e2e_event_0001",
  refundFull: "pi_e2e_refund_full_0001",
  refundPartial: "pi_e2e_refund_partial_0001",
};

export const PRICES = {
  formation: 9900,
  booking: 8000,
  event: 3500,
};

export const platformFee = (amountCents) =>
  Math.round(amountCents * (COMMISSION_RATE / 100));
