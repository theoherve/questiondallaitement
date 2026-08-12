import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetSessionUser = vi.fn();

vi.mock("@/lib/auth", () => ({
  getSessionUser: () => mockGetSessionUser(),
}));

vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  },
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const mockInsert = vi.fn(async (..._args: unknown[]) => ({
  id: "gc-1",
  code: "CADEAU-ABC234",
  expires_at: "2027-08-12T00:00:00.000Z",
}));
vi.mock("@/lib/gift-cards/code", () => ({
  insertGiftCardWithUniqueCode: (...args: unknown[]) => mockInsert(...args),
}));

const mockSendEmails = vi.fn(async (..._args: unknown[]) => {});
const mockSendRefundEmail = vi.fn(async (..._args: unknown[]) => {});
vi.mock("@/lib/gift-cards/emails", () => ({
  sendGiftCardPurchaseEmails: (...args: unknown[]) => mockSendEmails(...args),
  sendGiftCardRefundConfirmationEmail: (...args: unknown[]) => mockSendRefundEmail(...args),
}));

const mockGuestProfile = vi.fn(async (..._args: unknown[]) => ({
  success: true,
  id: "client-1",
}));
vi.mock("@/lib/auth/guest-profile", () => ({
  findOrCreateGuestProfile: (...args: unknown[]) => mockGuestProfile(...args),
}));

/** Lignes servies par table, et traces des ecritures. */
const tables: Record<string, unknown[]> = {};
const insertedRows: Array<{ table: string; row: unknown }> = [];
const rpcCalls: Array<{ name: string; args: unknown }> = [];
const rpcResult = { data: { id: "invoice-1" }, error: null as unknown };
const deletedRows: Array<{ table: string }> = [];

/**
 * Permet aux tests de simuler l'echec d'un `.update(...).eq(...)` ou d'un
 * `.delete().eq(...)` precis (ex: la cloture de la carte d'origine dans
 * `replaceExpiredGiftCard`), sans affecter les autres tables. Remis a `null`
 * dans `beforeEach`.
 */
const forcedUpdateError: { table: string | null; error: unknown } = {
  table: null,
  error: null,
};
const forcedDeleteError: { table: string | null; error: unknown } = {
  table: null,
  error: null,
};

const mockRpc = vi.fn(async (name: string, args: unknown) => {
  rpcCalls.push({ name, args });
  return rpcResult;
});

const buildChain = (table: string) => {
  const rows = () => tables[table] ?? [];
  const chain: Record<string, unknown> = {
    select: () => chain,
    // `eq` doit a la fois rester chainable (`.eq().maybeSingle()`) et
    // fonctionner comme terminal awaitable direct (`.eq()` seul, pour lire
    // `gift_card_redemptions` sans `.maybeSingle()` derriere) — d'ou ce
    // "then" ajoute a une copie du chain plutot qu'un simple retour de chain.
    eq: () => ({
      ...chain,
      then: (
        resolve: (v: { data: unknown[]; error: null }) => void,
      ) => resolve({ data: rows(), error: null }),
    }),
    order: () => Promise.resolve({ data: rows(), error: null }),
    maybeSingle: () => Promise.resolve({ data: rows()[0] ?? null, error: null }),
    single: () => Promise.resolve({ data: rows()[0] ?? null, error: null }),
    insert: (row: unknown) => {
      insertedRows.push({ table, row });
      return Promise.resolve({ error: null });
    },
    update: (patch: Record<string, unknown>) => ({
      eq: () => {
        // `.eq(id)` doit rester chainable avec `.is(...)` (garde TOCTOU des
        // actions post-expiration) sans executer l'effet (push / erreur
        // forcee) deux fois : le calcul n'a lieu qu'a la resolution finale,
        // que ce soit directement sur `.eq()` ou apres `.is()`.
        const settle = () => {
          if (forcedUpdateError.table === table) {
            return { error: forcedUpdateError.error };
          }
          insertedRows.push({ table: `${table}:update`, row: patch });
          return { error: null };
        };
        return {
          then: (resolve: (v: { error: unknown }) => void) => resolve(settle()),
          is: () => Promise.resolve(settle()),
        };
      },
    }),
    delete: () => ({
      eq: () => {
        if (forcedDeleteError.table === table) {
          return Promise.resolve({ error: forcedDeleteError.error });
        }
        deletedRows.push({ table });
        return Promise.resolve({ error: null });
      },
    }),
  };
  return chain;
};

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: (table: string) => buildChain(table), rpc: mockRpc }),
}));

import {
  issueGiftCardManually,
  listGiftCards,
  listConsultationTypesForGiftCards,
  refundExpiredGiftCard,
  replaceExpiredGiftCard,
} from "./actions";

const BILLING_CONSULTANT = {
  id: "consultant-1",
  is_active: true,
  billing_legal_name: "Carole Hervé",
  billing_address: "1 rue des Lilas, 44000 Nantes",
  billing_siren: "540075819",
  billing_vat_number: null,
  billing_legal_form: "Entreprise individuelle",
  billing_iban: "FR7630001007941234567890185",
  billing_bic: "BDFEFRPP",
};

const asAdmin = () =>
  mockGetSessionUser.mockResolvedValue({
    id: "admin-1",
    email: "admin@example.com",
    roles: ["admin"],
  });

// Hook global (et non scope a un seul `describe`) : `refundExpiredGiftCard`
// et `replaceExpiredGiftCard` sont testes dans des blocs `describe` freres de
// celui qui definit le `beforeEach` existant, qui ne les couvre donc pas.
beforeEach(() => {
  forcedUpdateError.table = null;
  forcedUpdateError.error = null;
  forcedDeleteError.table = null;
  forcedDeleteError.error = null;
  deletedRows.length = 0;
  insertedRows.length = 0;
  mockSendRefundEmail.mockClear();
});

describe("admin cartes-cadeaux actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const key of Object.keys(tables)) delete tables[key];
    insertedRows.length = 0;
    rpcCalls.length = 0;
    rpcResult.error = null;
    mockSendEmails.mockImplementation(async () => {});
    mockGuestProfile.mockImplementation(async () => ({ success: true, id: "client-1" }));
    tables.consultants = [BILLING_CONSULTANT];
    tables.profiles = [{ first_name: "Carole", last_name: "Hervé" }];
    tables.gift_cards = [];
    tables.consultation_types = [];
  });

  it("rejects issuance for a non-admin session", async () => {
    mockGetSessionUser.mockResolvedValue({ id: "u-1", email: "a@b.com", roles: ["client"] });

    await expect(
      issueGiftCardManually({
        type: "amount",
        amountCents: 9000,
        buyerName: "Geste commercial",
        buyerEmail: "client@example.com",
        deliveryMode: "email",
      }),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("issues a gift card with created_by=manual for an admin session", async () => {
    asAdmin();

    const result = await issueGiftCardManually({
      type: "amount",
      amountCents: 9000,
      buyerName: "Geste commercial",
      buyerEmail: "client@example.com",
      deliveryMode: "email",
    });

    expect(result.success).toBe(true);
    const buildRow = mockInsert.mock.calls[0][1] as (code: string) => Record<string, unknown>;
    const row = buildRow("CADEAU-ABC234");
    expect(row).toMatchObject({
      created_by: "manual",
      created_by_admin_id: "admin-1",
      consultant_id: "consultant-1",
    });
  });

  it("émet une facture à 0 € et envoie les emails de remise", async () => {
    asAdmin();

    const result = await issueGiftCardManually({
      type: "amount",
      amountCents: 9000,
      buyerName: "Geste commercial",
      buyerEmail: "client@example.com",
      beneficiaryEmail: "beneficiaire@example.com",
      deliveryMode: "email",
    });

    expect(result.success).toBe(true);
    expect(result.warning).toBeUndefined();

    // Traçabilité comptable du geste commercial (design §4) : même séquence de
    // numérotation que les factures automatiques.
    const invoiceCall = rpcCalls.find((c) => c.name === "create_manual_invoice");
    expect(invoiceCall).toBeDefined();
    expect((invoiceCall!.args as { p_content: Record<string, unknown> }).p_content).toMatchObject({
      amount_ttc_cents: 0,
      amount_ht_cents: 0,
      amount_vat_cents: 0,
      client_id: "client-1",
      issuer_legal_name: "Carole Hervé",
    });

    // Mêmes emails que le chemin d'achat en ligne, avec le nom réel de la
    // consultante et non une valeur codée en dur.
    expect(mockSendEmails).toHaveBeenCalledWith(
      expect.objectContaining({
        code: "CADEAU-ABC234",
        consultantName: "Carole Hervé",
        beneficiaryEmail: "beneficiaire@example.com",
      }),
    );
  });

  it("garde la carte et avertit quand la facture ou l'email echoue", async () => {
    asAdmin();
    rpcResult.error = { message: "boom" };
    mockSendEmails.mockImplementation(async () => {
      throw new Error("resend down");
    });
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await issueGiftCardManually({
      type: "amount",
      amountCents: 9000,
      buyerName: "Geste commercial",
      buyerEmail: "client@example.com",
      deliveryMode: "pdf",
    });

    // La carte existe et est utilisable : ces deux effets sont rattrapables a la
    // main, une carte non creee ne l'est pas.
    expect(result.success).toBe(true);
    expect(result.data?.code).toBe("CADEAU-ABC234");
    expect(result.warning).toContain("facture");
    expect(result.warning).toContain("email");
    expect(
      insertedRows.filter(
        (r) =>
          r.table === "audit_logs" &&
          (r.row as { action: string }).action === "gift_card_delivery_failed",
      ),
    ).toHaveLength(1);

    spy.mockRestore();
  });

  it("returns a clean error when no active consultant is found", async () => {
    asAdmin();
    tables.consultants = [];

    const result = await issueGiftCardManually({
      type: "amount",
      amountCents: 9000,
      buyerName: "Geste commercial",
      buyerEmail: "client@example.com",
      deliveryMode: "email",
    });

    expect(result).toEqual({ success: false, error: "Praticienne introuvable." });
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("affiche une carte perimee comme expiree, meme si le statut stocke est active", async () => {
    asAdmin();
    const past = new Date(Date.now() - 86_400_000).toISOString();
    const future = new Date(Date.now() + 86_400_000).toISOString();
    tables.gift_cards = [
      {
        id: "gc-old",
        code: "CADEAU-VIEUX0",
        type: "amount",
        status: "active",
        initial_amount_cents: 9000,
        buyer_name: "Jean",
        issued_at: past,
        expires_at: past,
        gift_card_redemptions: [],
      },
      {
        id: "gc-live",
        code: "CADEAU-VIVANT",
        type: "amount",
        status: "active",
        initial_amount_cents: 9000,
        buyer_name: "Jean",
        issued_at: past,
        expires_at: future,
        gift_card_redemptions: [{ amount_cents: 2000, redeemed_at: past }],
      },
    ];

    const result = await listGiftCards();

    expect(result.success).toBe(true);
    // `expired` n'est jamais ecrit en base : il se deduit de `expires_at`.
    // Sans ce calcul la carte restait « active » a vie dans le back-office.
    expect(result.data![0].status).toBe("expired");
    expect(result.data![1].status).toBe("active");
    expect(result.data![1].balanceCents).toBe(7000);
    expect(result.data![1].redemptions).toEqual([
      { amountCents: 2000, redeemedAt: past },
    ]);
  });

  it("expose closedReason pour une carte deja close par la procedure d'expiration", async () => {
    asAdmin();
    const past = new Date(Date.now() - 86_400_000).toISOString();
    tables.gift_cards = [
      {
        id: "gc-closed",
        code: "CADEAU-CLOSE0",
        type: "amount",
        status: "cancelled",
        initial_amount_cents: 9000,
        buyer_name: "Jean",
        issued_at: past,
        expires_at: past,
        closed_reason: "refunded",
        gift_card_redemptions: [],
      },
    ];

    const result = await listGiftCards();

    expect(result.success).toBe(true);
    expect(result.data![0].closedReason).toBe("refunded");
  });

  it("closedReason vaut null pour une carte non close", async () => {
    asAdmin();
    tables.gift_cards = [
      {
        id: "gc-open",
        code: "CADEAU-OPEN00",
        type: "amount",
        status: "active",
        initial_amount_cents: 9000,
        buyer_name: "Jean",
        issued_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 86_400_000).toISOString(),
        closed_reason: null,
        gift_card_redemptions: [],
      },
    ];

    const result = await listGiftCards();

    expect(result.data![0].closedReason).toBeNull();
  });

  it("lists gift cards for an admin session", async () => {
    asAdmin();
    const result = await listGiftCards();
    expect(result.success).toBe(true);
  });

  it("liste les prestations proposables pour une carte « prestation »", async () => {
    asAdmin();
    tables.consultation_types = [
      { id: "ct-1", title: "Consultation initiale", price_cents: 9000 },
    ];

    const result = await listConsultationTypesForGiftCards();

    expect(result.success).toBe(true);
    expect(result.data).toEqual([
      { id: "ct-1", title: "Consultation initiale", priceCents: 9000 },
    ]);
  });
});

describe("refundExpiredGiftCard", () => {
  const expiredCard = (overrides: Record<string, unknown> = {}) => ({
    id: "gc-expired",
    code: "CADEAU-EXPIR0",
    type: "amount",
    status: "active",
    initial_amount_cents: 9000,
    consultation_type_id: null,
    buyer_name: "Jean Martin",
    buyer_email: "jean@example.com",
    beneficiary_name: null,
    beneficiary_email: null,
    consultant_id: "consultant-1",
    closed_reason: null,
    created_by: "purchase",
    expires_at: new Date(Date.now() - 10 * 86_400_000).toISOString(),
    ...overrides,
  });

  it("refuse une carte qui n'est pas expiree", async () => {
    asAdmin();
    tables.gift_cards = [
      expiredCard({ expires_at: new Date(Date.now() + 86_400_000).toISOString() }),
    ];

    const result = await refundExpiredGiftCard({ giftCardId: "gc-expired", note: "test" });

    expect(result).toEqual({ success: false, error: "Cette carte n'est pas expirée." });
  });

  it("refuse une carte dont la fenetre de 90 jours est depassee", async () => {
    asAdmin();
    tables.gift_cards = [
      expiredCard({
        expires_at: new Date(Date.now() - 91 * 86_400_000).toISOString(),
      }),
    ];

    const result = await refundExpiredGiftCard({ giftCardId: "gc-expired", note: "test" });

    expect(result.success).toBe(false);
    expect(result.error).toContain("90 jours");
  });

  it("refuse une carte deja close", async () => {
    asAdmin();
    tables.gift_cards = [expiredCard({ closed_reason: "refunded" })];

    const result = await refundExpiredGiftCard({ giftCardId: "gc-expired", note: "test" });

    expect(result.success).toBe(false);
    expect(result.error).toContain("déjà été traitée");
  });

  it("cloture la carte et trace la decision quand elle est eligible", async () => {
    asAdmin();
    tables.gift_cards = [expiredCard()];

    const result = await refundExpiredGiftCard({
      giftCardId: "gc-expired",
      note: "Virement effectué le 12/08, réf ABC123",
    });

    expect(result.success).toBe(true);
    expect(
      insertedRows.filter(
        (r) =>
          r.table === "audit_logs" &&
          (r.row as { action: string }).action === "gift_card_refunded_after_expiry",
      ),
    ).toHaveLength(1);
  });

  it("envoie un email de confirmation apres remboursement", async () => {
    asAdmin();
    tables.gift_cards = [expiredCard()];

    await refundExpiredGiftCard({ giftCardId: "gc-expired", note: "test" });

    expect(mockSendRefundEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        code: "CADEAU-EXPIR0",
        recipientEmail: "jean@example.com",
      }),
    );
  });

  it("reste un succes meme si l'email de confirmation echoue", async () => {
    asAdmin();
    tables.gift_cards = [expiredCard()];
    mockSendRefundEmail.mockRejectedValueOnce(new Error("resend down"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await refundExpiredGiftCard({ giftCardId: "gc-expired", note: "test" });

    expect(result.success).toBe(true);
    expect(
      insertedRows.filter((r) => r.table === "gift_cards:update"),
    ).toHaveLength(1);

    spy.mockRestore();
  });

  it("refuse le remboursement d'une carte emise a titre gracieux (created_by=manual)", async () => {
    asAdmin();
    tables.gift_cards = [expiredCard({ created_by: "manual" })];

    const result = await refundExpiredGiftCard({ giftCardId: "gc-expired", note: "test" });

    expect(result).toEqual({
      success: false,
      error: "Une carte offerte à titre gracieux n'est pas remboursable.",
    });
    expect(
      insertedRows.filter((r) => r.table === "gift_cards:update"),
    ).toHaveLength(0);
  });
});

describe("replaceExpiredGiftCard", () => {
  const expiredAmountCard = (overrides: Record<string, unknown> = {}) => ({
    id: "gc-expired",
    code: "CADEAU-EXPIR0",
    type: "amount",
    status: "active",
    initial_amount_cents: 9000,
    consultation_type_id: null,
    buyer_name: "Jean Martin",
    buyer_email: "jean@example.com",
    beneficiary_name: "Marie Dupont",
    beneficiary_email: "marie@example.com",
    consultant_id: "consultant-1",
    closed_reason: null,
    // Cartes emises a titre gracieux par defaut ici : le remplacement doit
    // rester possible pour elles (seul le remboursement, teste plus haut, les
    // exclut) — voir l'assertion `created_by` plus bas.
    created_by: "manual",
    expires_at: new Date(Date.now() - 10 * 86_400_000).toISOString(),
    ...overrides,
  });

  it("refuse le remplacement d'une carte non eligible", async () => {
    asAdmin();
    tables.gift_cards = [
      expiredAmountCard({ expires_at: new Date(Date.now() + 86_400_000).toISOString() }),
    ];

    const result = await replaceExpiredGiftCard({ giftCardId: "gc-expired", note: "test" });

    expect(result.success).toBe(false);
  });

  it("refuse le remplacement d'une carte 'montant' entierement consommee", async () => {
    asAdmin();
    tables.gift_cards = [expiredAmountCard()];
    tables.gift_card_redemptions = [{ gift_card_id: "gc-expired", amount_cents: 9000 }];

    const result = await replaceExpiredGiftCard({ giftCardId: "gc-expired", note: "test" });

    expect(result.success).toBe(false);
    expect(result.error).toContain("solde");
  });

  it("emet une nouvelle carte de 9 mois avec le solde restant, et cloture l'originale", async () => {
    asAdmin();
    // La carte d'origine ici est `created_by: 'manual'` (fixture par defaut) :
    // la prolongation reste autorisee pour une carte offerte a titre gracieux,
    // seul le remboursement l'exclut (voir describe("refundExpiredGiftCard")).
    tables.gift_cards = [expiredAmountCard()];
    tables.gift_card_redemptions = [{ gift_card_id: "gc-expired", amount_cents: 2000 }];

    const result = await replaceExpiredGiftCard({
      giftCardId: "gc-expired",
      note: "Demande recue le 12/08",
    });

    expect(result.success).toBe(true);
    expect(result.data?.code).toBe("CADEAU-ABC234"); // mockInsert renvoie toujours ce code

    const buildRow = mockInsert.mock.calls[0][1] as (code: string) => Record<string, unknown>;
    const row = buildRow("CADEAU-ABC234");
    expect(row).toMatchObject({
      type: "amount",
      initial_amount_cents: 7000,
      consultant_id: "consultant-1",
      buyer_email: "jean@example.com",
      beneficiary_email: "marie@example.com",
      created_by: "manual",
      replaces_gift_card_id: "gc-expired",
    });

    const expiresAt = new Date(row.expires_at as string);
    const expectedMonth = (new Date().getMonth() + 9) % 12;
    expect(expiresAt.getMonth()).toBe(expectedMonth);

    expect(
      insertedRows.filter(
        (r) =>
          r.table === "audit_logs" &&
          (r.row as { action: string }).action === "gift_card_replaced_after_expiry",
      ),
    ).toHaveLength(1);
    expect(mockSendEmails).toHaveBeenCalledWith(
      expect.objectContaining({ beneficiaryEmail: "marie@example.com" }),
    );
  });

  it("reporte consultation_type_id et pas de solde pour une carte 'service'", async () => {
    asAdmin();
    tables.gift_cards = [
      expiredAmountCard({
        type: "service",
        initial_amount_cents: null,
        consultation_type_id: "ct-1",
      }),
    ];

    const result = await replaceExpiredGiftCard({ giftCardId: "gc-expired", note: "test" });

    expect(result.success).toBe(true);

    // Pas de lecture de gift_card_redemptions pour une carte 'service' : le
    // solde ne s'applique pas, contrairement au type 'amount'. `mockInsert`
    // n'est pas vide en entrant ici (pas de `beforeEach` clearAllMocks dans
    // ce `describe`) : on prend son dernier appel plutot que le premier.
    const lastCall = mockInsert.mock.calls.at(-1) as unknown[];
    const buildRow = lastCall[1] as (code: string) => Record<string, unknown>;
    const row = buildRow("CADEAU-ABC234");
    expect(row).toMatchObject({
      type: "service",
      consultation_type_id: "ct-1",
      initial_amount_cents: null,
      replaces_gift_card_id: "gc-expired",
    });
  });

  it(
    "annule la carte de remplacement si la cloture de l'originale echoue, " +
      "pour eviter deux cartes actives sur le meme solde",
    async () => {
      asAdmin();
      tables.gift_cards = [expiredAmountCard()];
      tables.gift_card_redemptions = [{ gift_card_id: "gc-expired", amount_cents: 2000 }];
      forcedUpdateError.table = "gift_cards";
      forcedUpdateError.error = { message: "connection reset" };
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});

      const result = await replaceExpiredGiftCard({ giftCardId: "gc-expired", note: "test" });

      expect(result.success).toBe(false);
      // La carte de remplacement, deja creee avant la tentative de cloture,
      // doit avoir ete annulee — sinon l'ancienne et la nouvelle seraient
      // actives en meme temps pour le meme solde.
      expect(deletedRows).toEqual([{ table: "gift_cards" }]);
      expect(result.error).not.toContain("intervention manuelle");

      spy.mockRestore();
    },
  );

  it(
    "signale clairement qu'une intervention manuelle est necessaire si la " +
      "compensation echoue aussi",
    async () => {
      asAdmin();
      tables.gift_cards = [expiredAmountCard()];
      tables.gift_card_redemptions = [{ gift_card_id: "gc-expired", amount_cents: 2000 }];
      forcedUpdateError.table = "gift_cards";
      forcedUpdateError.error = { message: "connection reset" };
      forcedDeleteError.table = "gift_cards";
      forcedDeleteError.error = { message: "connection reset" };
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});

      const result = await replaceExpiredGiftCard({ giftCardId: "gc-expired", note: "test" });

      expect(result.success).toBe(false);
      expect(deletedRows).toEqual([]);
      expect(result.error).toContain("intervention manuelle");
      // Les deux identifiants doivent etre traces pour permettre une
      // reconciliation manuelle — le doublon actif ne se rattrape pas seul.
      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining("intervention manuelle requise"),
        expect.objectContaining({
          originalGiftCardId: "gc-expired",
          replacementGiftCardId: "gc-1",
        }),
      );

      spy.mockRestore();
    },
  );
});
