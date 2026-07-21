import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Supabase mock ────────────────────────────────────────────

// Suivi des appels par table — réinitialisé via state dans chaque beforeEach
// pour éviter toute contamination entre suites (pas de .length = 0 oublié)
const state = {
  upsertCalls: [] as Array<{ table: string; data: unknown; opts?: unknown }>,
  insertCalls: [] as Array<{ table: string; data: unknown }>,
  updateCalls: [] as Array<{ table: string; data: unknown }>,
};

// Config par table : { single?, list?, insertError? }
const db: Record<
  string,
  { single?: unknown; list?: unknown[]; insertError?: { code: string; message: string } }
> = {};

const createChain = (table: string) => {
  const config = db[table] ?? {};

  const chain: Record<string, unknown> = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    update: vi.fn((data: unknown) => {
      state.updateCalls.push({ table, data });
      return chain;
    }),
    upsert: vi.fn((data: unknown, opts?: unknown) => {
      state.upsertCalls.push({ table, data, opts });
      return Promise.resolve({ error: null });
    }),
    insert: vi.fn((data: unknown) => {
      state.insertCalls.push({ table, data });
      return Promise.resolve({ error: config.insertError ?? null });
    }),
    single: vi.fn().mockResolvedValue({ data: config.single ?? null, error: null }),
  };

  // Thenable pour les requêtes sans .single() (ex: .select().eq() await)
  (chain as { then?: (onFulfilled: (value: unknown) => unknown) => unknown }).then = (
    onFulfilled: (value: unknown) => unknown,
  ) => Promise.resolve({ data: config.list ?? [], error: null }).then(onFulfilled);

  return chain;
};

const mockFrom = vi.fn((table: string) => createChain(table));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockFrom }),
}));

// ─── Dépendances externes mockées ────────────────────────────

const mockCreateTransfer = vi.fn().mockResolvedValue({ id: "tr_test" });
const mockCreateRefund = vi.fn().mockResolvedValue({ id: "re_test" });

vi.mock("@/lib/stripe/connect", () => ({
  createTransfer: (...args: unknown[]) => mockCreateTransfer(...args),
  createRefund: (...args: unknown[]) => mockCreateRefund(...args),
}));

const mockChargeRetrieve = vi.fn();

vi.mock("@/lib/stripe/client", () => ({
  stripe: {
    paymentIntents: {
      retrieve: vi.fn().mockResolvedValue({ latest_charge: "ch_test_001" }),
    },
    charges: { retrieve: (...a: unknown[]) => mockChargeRetrieve(...a) },
  },
}));

const mockSendSlotConflict = vi.fn().mockResolvedValue(undefined);

vi.mock("@/lib/emails/send", () => ({
  sendFormationAccess: vi.fn().mockResolvedValue(undefined),
  sendBookingConfirmation: vi.fn().mockResolvedValue(undefined),
  sendBookingConfirmedToConsultant: vi.fn().mockResolvedValue(undefined),
  sendBookingSlotConflict: (...args: unknown[]) => mockSendSlotConflict(...args),
}));

vi.mock("@/lib/automations/engine", () => ({
  runAutomations: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/notifications", () => ({
  createNotification: vi.fn().mockResolvedValue(undefined),
}));

import {
  handleCheckoutCompleted,
  handleChargeRefunded,
  handleAccountUpdated,
  handleAccountDeauthorized,
} from "./webhooks";
import type Stripe from "stripe";

// ─── Fixtures ─────────────────────────────────────────────────

const CLIENT_ID = "client-uuid-001";
const CONSULTANT_ID = "consultant-uuid-002";
const FORMATION_ID = "formation-uuid-003";
const BOOKING_ID = "booking-uuid-004";
const PAYMENT_INTENT_ID = "pi_test_001";

const makeFormationSession = (): Stripe.Checkout.Session =>
  ({
    id: "cs_test_formation",
    amount_total: 5000,
    currency: "eur",
    payment_intent: PAYMENT_INTENT_ID,
    metadata: {
      type: "formation",
      reference_id: FORMATION_ID,
      client_id: CLIENT_ID,
      consultant_id: CONSULTANT_ID,
      platform_fee_cents: "500",
    },
  }) as unknown as Stripe.Checkout.Session;

const makeBookingSession = (): Stripe.Checkout.Session =>
  ({
    id: "cs_test_booking",
    amount_total: 7000,
    currency: "eur",
    payment_intent: PAYMENT_INTENT_ID,
    metadata: {
      type: "booking",
      reference_id: BOOKING_ID,
      client_id: CLIENT_ID,
      consultant_id: CONSULTANT_ID,
      consultation_type_id: "ct-uuid-001",
      duration_option_id: "do-uuid-001",
      starts_at: "2024-03-15T10:00:00.000Z",
      ends_at: "2024-03-15T11:00:00.000Z",
      location: "teleconsultation",
      reason: "Allaitement difficile",
      platform_fee_cents: "700",
    },
  }) as unknown as Stripe.Checkout.Session;

// ─── handleCheckoutCompleted — formation (14-05) ──────────────

describe("handleCheckoutCompleted — type formation (14-05)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.upsertCalls = [];
    state.insertCalls = [];
    state.updateCalls = [];

    // Pas de collaborateurs par défaut
    db["formation_collaborators"] = { list: [] };
    db["formation_enrollments"] = {};
    db["payments"] = {};
    db["audit_logs"] = {};
    db["profiles"] = { single: { email: "client@test.fr", first_name: "Marie" } };
    db["formations"] = {
      single: { title: "Formation allaitement", consultant_id: CONSULTANT_ID },
    };
    db["consultants"] = { list: [] };
    // Charge restee sur la plateforme : pas de transfert attache, donc les
    // fonds sont disponibles pour etre repartis.
    mockChargeRetrieve.mockResolvedValue({ id: "ch_test_001", transfer: null });
  });

  it("crée un enrollment (upsert formation_enrollments)", async () => {
    await handleCheckoutCompleted(makeFormationSession());

    const enrollment = state.upsertCalls.find((c) => c.table === "formation_enrollments");
    expect(enrollment).toBeDefined();
    expect(enrollment!.data).toMatchObject({
      client_id: CLIENT_ID,
      formation_id: FORMATION_ID,
      stripe_payment_intent_id: PAYMENT_INTENT_ID,
    });
  });

  it("enregistre le paiement (upsert payments)", async () => {
    await handleCheckoutCompleted(makeFormationSession());

    const payment = state.upsertCalls.find((c) => c.table === "payments");
    expect(payment).toBeDefined();
    expect(payment!.data).toMatchObject({
      client_id: CLIENT_ID,
      consultant_id: CONSULTANT_ID,
      amount_cents: 5000,
      type: "formation",
      status: "succeeded",
    });
  });

  it("ne crée pas de transfer si aucun collaborateur", async () => {
    await handleCheckoutCompleted(makeFormationSession());
    expect(mockCreateTransfer).not.toHaveBeenCalled();
  });

  it("repartit la vente entre collaboratrice et proprietaire", async () => {
    // Modele « separate charges and transfers » : la charge reste sur la
    // plateforme et chaque part est virée en citant la charge source. Avant,
    // la proprietaire recevait tout par charge destination et la plateforme
    // payait la collaboratrice de son propre solde — quand elle le pouvait.
    db["formation_collaborators"] = {
      list: [
        {
          consultant_id: "collab-uuid-001",
          revenue_share: 30,
          consultants: {
            stripe_account_id: "acct_collab001",
            stripe_account_status: "active",
          },
        },
      ],
    };
    db["payments"] = { single: { amount_cents: 5000, platform_fee_cents: 500 } };
    db["consultants"] = {
      list: [
        { id: "collab-uuid-001", stripe_account_id: "acct_collab001", stripe_account_status: "active" },
        { id: CONSULTANT_ID, stripe_account_id: "acct_owner", stripe_account_status: "active" },
      ],
    };

    await handleCheckoutCompleted(makeFormationSession());

    // Net = 5000 - 500 = 4500 ; collaboratrice 30 % = 1350, proprietaire 3150.
    expect(mockCreateTransfer).toHaveBeenCalledWith(
      1350,
      "acct_collab001",
      expect.objectContaining({ formation_id: FORMATION_ID }),
      expect.objectContaining({ sourceTransaction: "ch_test_001" }),
    );
    expect(mockCreateTransfer).toHaveBeenCalledWith(
      3150,
      "acct_owner",
      expect.anything(),
      expect.anything(),
    );
  });

  it("rend chaque virement rejouable sans doubler la mise", async () => {
    // Stripe redelivre volontiers un evenement. Sans cle d'idempotence, la
    // repartition entiere serait versee une seconde fois.
    db["formation_collaborators"] = {
      list: [
        {
          consultant_id: "collab-uuid-001",
          revenue_share: 30,
          consultants: {
            stripe_account_id: "acct_collab001",
            stripe_account_status: "active",
          },
        },
      ],
    };
    db["payments"] = { single: { amount_cents: 5000, platform_fee_cents: 500 } };
    db["consultants"] = {
      list: [
        { id: "collab-uuid-001", stripe_account_id: "acct_collab001", stripe_account_status: "active" },
      ],
    };

    await handleCheckoutCompleted(makeFormationSession());

    expect(mockCreateTransfer).toHaveBeenCalledWith(
      expect.any(Number),
      "acct_collab001",
      expect.anything(),
      expect.objectContaining({
        idempotencyKey: `split:${PAYMENT_INTENT_ID}:collab-uuid-001`,
      }),
    );
  });

  it("ne repartit rien si les fonds sont deja partis chez la consultante", async () => {
    // Vente creee avant la bascule de modele : la charge porte un transfert,
    // la plateforme n'a plus les fonds. Tenter un virement echouerait en
    // `balance_insufficient` ; on trace au lieu de bruler l'argent.
    db["formation_collaborators"] = {
      list: [
        {
          consultant_id: "collab-uuid-001",
          revenue_share: 30,
          consultants: {
            stripe_account_id: "acct_collab001",
            stripe_account_status: "active",
          },
        },
      ],
    };
    db["payments"] = { single: { amount_cents: 5000, platform_fee_cents: 500 } };
    mockChargeRetrieve.mockResolvedValue({
      id: "ch_test_001",
      transfer: { id: "tr_existant" },
    });

    await handleCheckoutCompleted(makeFormationSession());

    expect(mockCreateTransfer).not.toHaveBeenCalled();
    const log = state.insertCalls.find(
      (c) =>
        c.table === "audit_logs" &&
        (c.data as { action: string }).action === "collaborator_split_impossible",
    );
    expect(log).toBeDefined();
  });

  it("skip le transfer si le collaborateur n'a pas de Stripe actif", async () => {
    db["formation_collaborators"] = {
      list: [
        {
          consultant_id: "collab-uuid-002",
          revenue_share: 20,
          consultants: {
            stripe_account_id: null,
            stripe_account_status: null,
          },
        },
      ],
    };
    db["payments"] = {
      single: { amount_cents: 5000, platform_fee_cents: 500 },
    };
    // Aucun compte actif : la part de la collaboratrice revient a la
    // proprietaire, qui n'a pas de compte non plus dans ce scenario.
    db["consultants"] = { list: [] };

    await handleCheckoutCompleted(makeFormationSession());

    expect(mockCreateTransfer).not.toHaveBeenCalled();
    // Un audit "collaborator_transfer_skipped" doit être loggé
    const skippedLog = state.insertCalls.find(
      (c) =>
        c.table === "audit_logs" &&
        (c.data as { action: string }).action === "collaborator_transfer_skipped",
    );
    expect(skippedLog).toBeDefined();
  });
});

// ─── handleCheckoutCompleted — booking (14-05 & 14-06) ────────

describe("handleCheckoutCompleted — type booking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.upsertCalls = [];
    state.insertCalls = [];
    state.updateCalls = [];

    db["bookings"] = {};
    db["payments"] = {};
    db["audit_logs"] = {};
    db["consultation_types"] = { single: { title: "Consultation allaitement" } };
    db["profiles"] = { single: { email: "client@test.fr", first_name: "Marie" } };
  });

  it("insère le booking avec status confirmed", async () => {
    await handleCheckoutCompleted(makeBookingSession());

    const bookingInsert = state.insertCalls.find((c) => c.table === "bookings");
    expect(bookingInsert).toBeDefined();
    expect(bookingInsert!.data).toMatchObject({
      id: BOOKING_ID,
      client_id: CLIENT_ID,
      consultant_id: CONSULTANT_ID,
      status: "confirmed",
      payment_method: "online",
      location: "teleconsultation",
    });
  });

  it("enregistre le paiement (upsert payments)", async () => {
    await handleCheckoutCompleted(makeBookingSession());

    const payment = state.upsertCalls.find((c) => c.table === "payments");
    expect(payment).toBeDefined();
    expect(payment!.data).toMatchObject({
      amount_cents: 7000,
      type: "booking",
      status: "succeeded",
    });
  });

  // ─── Constat B : redelivery Stripe ──────────────────────────

  it("reste silencieux quand le booking existe deja (redelivery Stripe)", async () => {
    db["bookings"] = {
      insertError: {
        code: "23505",
        message: 'duplicate key value violates unique constraint "bookings_pkey"',
      },
    };

    // Une redelivery est normale : Stripe retente sur timeout. L'evenement a
    // deja ete traite, il ne faut surtout pas remonter d'erreur — sinon Stripe
    // retente en boucle un evenement qui n'echouera jamais autrement.
    await expect(
      handleCheckoutCompleted(makeBookingSession()),
    ).resolves.not.toThrow();
  });

  it("propage une erreur d'insert inattendue pour que Stripe retente", async () => {
    db["bookings"] = {
      insertError: { code: "42501", message: "permission denied for table bookings" },
    };

    // Avaler cette erreur ferait croire a Stripe que le paiement est traite
    // alors que la reservation n'existe pas : la cliente a paye pour rien.
    await expect(
      handleCheckoutCompleted(makeBookingSession()),
    ).rejects.toThrow(/permission denied/);
  });

  // ─── Constat A : double booking ─────────────────────────────

  it("rembourse la cliente quand le creneau a ete pris entre-temps", async () => {
    db["bookings"] = {
      insertError: {
        code: "23505",
        message:
          'duplicate key value violates unique constraint "bookings_consultant_slot_unique"',
      },
    };

    await handleCheckoutCompleted(makeBookingSession());

    // Refund total : createRefund appele sans montant partiel.
    expect(mockCreateRefund).toHaveBeenCalledWith(PAYMENT_INTENT_ID);
  });

  it("previent la cliente quand son creneau a ete pris", async () => {
    db["bookings"] = {
      insertError: {
        code: "23505",
        message:
          'duplicate key value violates unique constraint "bookings_consultant_slot_unique"',
      },
    };

    await handleCheckoutCompleted(makeBookingSession());

    // Rembourser sans prevenir laisse la cliente devant un debit puis un
    // credit inexpliques, et un creneau qu'elle croit reserve.
    expect(mockSendSlotConflict).toHaveBeenCalledTimes(1);
    const [email, vars] = mockSendSlotConflict.mock.calls[0];
    expect(email).toBe("client@test.fr");
    expect(vars).toMatchObject({ amount_refunded: expect.any(String) });
  });

  it("n'enregistre pas le paiement comme encaisse en cas de conflit de creneau", async () => {
    db["bookings"] = {
      insertError: {
        code: "23505",
        message:
          'duplicate key value violates unique constraint "bookings_consultant_slot_unique"',
      },
    };

    await handleCheckoutCompleted(makeBookingSession());

    const payment = state.upsertCalls.find((c) => c.table === "payments");
    expect(payment?.data).toMatchObject({ status: "refunded" });
  });
});

// ─── handleChargeRefunded (14-08 côté webhook) ────────────────

describe("handleChargeRefunded", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.updateCalls = [];
    db["payments"] = {};
  });

  const makeCharge = (amount: number, refunded: number): Stripe.Charge =>
    ({
      payment_intent: PAYMENT_INTENT_ID,
      amount,
      amount_refunded: refunded,
    }) as unknown as Stripe.Charge;

  it("met le statut 'refunded' pour un remboursement total", async () => {
    await handleChargeRefunded(makeCharge(5000, 5000));

    const updateCall = state.updateCalls.find((c) => c.table === "payments");
    expect(updateCall).toBeDefined();
    expect(updateCall!.data).toMatchObject({ status: "refunded", refund_amount_cents: 5000 });
  });

  it("met le statut 'partially_refunded' pour un remboursement partiel", async () => {
    await handleChargeRefunded(makeCharge(5000, 2500));

    const updateCall = state.updateCalls.find((c) => c.table === "payments");
    expect(updateCall).toBeDefined();
    expect(updateCall!.data).toMatchObject({ status: "partially_refunded", refund_amount_cents: 2500 });
  });

  it("ne fait rien si payment_intent est absent", async () => {
    await handleChargeRefunded({ payment_intent: null, amount: 5000, amount_refunded: 5000 } as unknown as Stripe.Charge);
    expect(state.updateCalls).toHaveLength(0);
  });

  // ─── 4-4 : coherence entre `payments` et `bookings` ─────────
  //
  // Un remboursement emis depuis le dashboard Stripe ne passe pas par
  // `cancelBooking` : seul cet evenement en informe l'application. Tant qu'il
  // ne touchait que `payments`, la reservation restait active — la consultante
  // gardait un rendez-vous a son agenda, le creneau restait bloque par l'index
  // d'unicite, et la cliente croyait sa place reservee alors qu'elle etait
  // remboursee.

  const bookingPayment = () => {
    db["payments"] = { single: { type: "booking", reference_id: BOOKING_ID } };
  };

  it("annule la reservation quand le remboursement est integral", async () => {
    bookingPayment();
    db["bookings"] = { single: { id: BOOKING_ID, status: "confirmed" } };

    await handleChargeRefunded(makeCharge(5000, 5000));

    const call = state.updateCalls.find((c) => c.table === "bookings");
    expect(call, "la reservation n'a pas ete mise a jour").toBeDefined();
    expect(call!.data).toMatchObject({
      status: "cancelled",
      refund_amount_cents: 5000,
    });
  });

  it("enregistre le montant sans annuler quand le remboursement est partiel", async () => {
    // C'est la forme que prend la penalite d'annulation tardive : la
    // reservation a deja ete traitee par l'application, l'evenement ne fait
    // que confirmer le montant.
    bookingPayment();
    db["bookings"] = { single: { id: BOOKING_ID, status: "cancelled" } };

    await handleChargeRefunded(makeCharge(5000, 2500));

    const call = state.updateCalls.find((c) => c.table === "bookings");
    expect(call!.data).toMatchObject({ refund_amount_cents: 2500 });
    expect(call!.data).not.toHaveProperty("status");
  });

  it("ne ressuscite pas une reservation deja annulee", async () => {
    // Chemin applicatif : `cancelBooking` a deja tout pose, puis Stripe emet
    // l'evenement. Le reecrire en boucle doit rester sans effet de bord.
    bookingPayment();
    db["bookings"] = { single: { id: BOOKING_ID, status: "cancelled" } };

    await handleChargeRefunded(makeCharge(5000, 5000));

    const call = state.updateCalls.find((c) => c.table === "bookings");
    expect(call!.data).not.toHaveProperty("cancelled_at");
    expect(call!.data).toMatchObject({ refund_amount_cents: 5000 });
  });

  it("n'annule pas une consultation deja honoree", async () => {
    // Rembourser apres coup est un geste commercial : la consultation a bien
    // eu lieu, l'effacer de l'agenda serait faux.
    bookingPayment();
    db["bookings"] = { single: { id: BOOKING_ID, status: "completed" } };

    await handleChargeRefunded(makeCharge(5000, 5000));

    const call = state.updateCalls.find((c) => c.table === "bookings");
    expect(call!.data).not.toHaveProperty("status");
    expect(call!.data).toMatchObject({ refund_amount_cents: 5000 });
  });

  it("ne touche a aucune reservation pour un achat d'accompagnement", async () => {
    db["payments"] = { single: { type: "formation", reference_id: FORMATION_ID } };

    await handleChargeRefunded(makeCharge(5000, 5000));

    expect(state.updateCalls.find((c) => c.table === "bookings")).toBeUndefined();
  });
});

// ─── handleAccountUpdated ─────────────────────────────────────

describe("handleAccountUpdated", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.updateCalls = [];
    db["consultants"] = {};
  });

  const makeAccount = (chargesEnabled: boolean, detailsSubmitted: boolean): Stripe.Account =>
    ({
      metadata: { consultant_id: CONSULTANT_ID },
      charges_enabled: chargesEnabled,
      details_submitted: detailsSubmitted,
    }) as unknown as Stripe.Account;

  it("passe en 'active' si charges_enabled", async () => {
    await handleAccountUpdated(makeAccount(true, true));
    const call = state.updateCalls.find((c) => c.table === "consultants");
    expect(call!.data).toMatchObject({ stripe_account_status: "active" });
  });

  it("passe en 'pending_verification' si details_submitted mais pas charges_enabled", async () => {
    await handleAccountUpdated(makeAccount(false, true));
    const call = state.updateCalls.find((c) => c.table === "consultants");
    expect(call!.data).toMatchObject({ stripe_account_status: "pending_verification" });
  });

  it("passe en 'pending' si rien de soumis", async () => {
    await handleAccountUpdated(makeAccount(false, false));
    const call = state.updateCalls.find((c) => c.table === "consultants");
    expect(call!.data).toMatchObject({ stripe_account_status: "pending" });
  });

  it("ne fait rien si consultant_id manquant dans les métadonnées", async () => {
    await handleAccountUpdated({ metadata: {} } as unknown as Stripe.Account);
    expect(state.updateCalls).toHaveLength(0);
  });

  // ─── 4-5 : `onboarding_completed` suit l'etat reel chez Stripe ─────

  it("marque l'onboarding termine quand le compte peut encaisser", async () => {
    // `onboarding_completed` etait lu par l'admin (badge « onboarding non
    // termine ») mais ecrit nulle part : il restait `false` a vie, y compris
    // pour une consultante parfaitement operationnelle. Seul cet evenement
    // sait quand Stripe a fini de valider le compte.
    await handleAccountUpdated(makeAccount(true, true));

    const call = state.updateCalls.find((c) => c.table === "consultants");
    expect(call!.data).toMatchObject({ onboarding_completed: true });
  });

  it("ne declare pas l'onboarding termine tant que l'encaissement est bloque", async () => {
    // `details_submitted` signifie « formulaire envoye », pas « valide ».
    // Stripe peut encore reclamer des pieces.
    await handleAccountUpdated(makeAccount(false, true));

    const call = state.updateCalls.find((c) => c.table === "consultants");
    expect(call!.data).toMatchObject({ onboarding_completed: false });
  });
});

// ─── handleAccountDeauthorized ────────────────────────────────

describe("handleAccountDeauthorized", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.updateCalls = [];
    db["consultants"] = {};
  });

  it("désactive la consultante et efface le compte Stripe", async () => {
    await handleAccountDeauthorized({
      metadata: { consultant_id: CONSULTANT_ID },
    } as unknown as Stripe.Account);

    const call = state.updateCalls.find((c) => c.table === "consultants");
    expect(call!.data).toMatchObject({
      stripe_account_id: null,
      stripe_account_status: "deauthorized",
      is_active: false,
    });
  });

  it("remet l'onboarding a refaire", async () => {
    // Le compte Stripe est parti : laisser `onboarding_completed` a true
    // afficherait une consultante prete a encaisser alors qu'elle n'a plus
    // aucun compte destinataire.
    await handleAccountDeauthorized({
      metadata: { consultant_id: CONSULTANT_ID },
    } as unknown as Stripe.Account);

    const call = state.updateCalls.find((c) => c.table === "consultants");
    expect(call!.data).toMatchObject({ onboarding_completed: false });
  });
});
