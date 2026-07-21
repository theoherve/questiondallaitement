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
  cabinetLocation: id("320"),
  event: id("500"),
  // Reference IDs carried in Stripe metadata
  booking: id("600"),
  /**
   * Reservations propres aux scenarios de remboursement.
   *
   * Distinctes de `booking` : depuis que `charge.refunded` annule la
   * reservation, viser la meme ligne rendrait les scenarios dependants de leur
   * ordre d'execution — le remboursement total annulerait la reservation que
   * le remboursement partiel s'attend a trouver active.
   */
  bookingRefundFull: id("601"),
  bookingRefundPartial: id("602"),
  /** One weekly availability row per weekday, ids 701..705. */
  availability: (dayOfWeek) => id(`70${dayOfWeek}`),
};

export const PREFIX = "e2e00000-0000-4000-8000-";

export const CLIENT_EMAIL = "e2e-client@questiondallaitement.test";
export const CONSULTANT_EMAIL = "e2e-consultante@questiondallaitement.test";

/**
 * Invitee du scenario guest checkout.
 *
 * Jamais seedee : son profil doit etre cree par `createBooking` lui-meme, c'est
 * precisement ce que le scenario verifie. Elle est en revanche nettoyee, sinon
 * la deuxieme passe emprunterait le chemin « profil existant ».
 */
export const GUEST_EMAIL = "e2e-guest@questiondallaitement.test";

/**
 * Connect account backing the fixture consultant.
 *
 * Defaults to a fake ID: N1 replays signed payloads locally and never calls
 * Stripe, so the account only ever needs to exist in the database. N2 drives a
 * real Checkout, which Stripe rejects unless the destination is a genuine
 * onboarded account with the `transfers` capability — so that suite overrides
 * this with E2E_CONNECT_ACCOUNT.
 */
export const CONSULTANT_STRIPE_ACCOUNT =
  process.env.E2E_CONNECT_ACCOUNT ?? "acct_e2e_test_consultant";

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
