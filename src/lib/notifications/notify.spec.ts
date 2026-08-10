import { describe, it, expect, vi, beforeEach } from "vitest";

const mockUpsert = vi.fn();
const mockFrom = vi.fn(() => ({ upsert: mockUpsert }));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockFrom }),
}));

const sendInvoiceEmail = vi.fn();
const sendReplayEmail = vi.fn();

vi.mock("./catalog", () => ({
  NOTIFICATION_CATALOG: {
    invoice_available: {
      key: "invoice_available",
      category: "transactional",
      preferenceKey: "paiements",
      channels: ["in_app", "email"],
      title: () => "Votre facture est disponible",
      body: (d: { number: string; amount: string }) =>
        `Facture ${d.number}, ${d.amount}.`,
      href: () => "/espace-client/factures",
      actions: (d: { invoice_id: string }) => [
        { label: "Télécharger", href: `/api/invoices/${d.invoice_id}/pdf` },
      ],
      email: (to: string, d: unknown) => sendInvoiceEmail(to, d),
    },
    admin_message: {
      key: "admin_message",
      category: "system",
      preferenceKey: "systeme",
      channels: ["in_app"],
      title: () => "Message de l'équipe",
    },
    replay_published: {
      key: "replay_published",
      category: "marketing",
      preferenceKey: "replays",
      channels: ["in_app", "email", "push"],
      title: () => "Nouveau replay",
      email: (to: string, d: unknown) => sendReplayEmail(to, d),
    },
    booking_reminder: {
      key: "booking_reminder",
      category: "transactional",
      preferenceKey: "rendez_vous",
      channels: ["in_app", "email", "push"],
      title: (d: { time: string }) => `Rappel : consultation demain à ${d.time}`,
      href: () => "/espace-client/reservations",
    },
  },
}));

// `vi.hoisted` est obligatoire : `vi.mock` est hissé en haut du fichier, un
// `const` ordinaire n'existerait pas encore quand la fabrique s'exécute.
const { loadPreferences } = vi.hoisted(() => ({
  loadPreferences: vi.fn().mockResolvedValue({}),
}));

vi.mock("./preferences", async (importOriginal) => {
  // `resolveChannels` reste le vrai : c'est lui qu'on veut voir appliquer les
  // écarts renvoyés par le faux `loadPreferences`.
  const actual = await importOriginal<typeof import("./preferences")>();
  return { ...actual, loadPreferences };
});

const { sendPushToUser } = vi.hoisted(() => ({
  sendPushToUser: vi.fn().mockResolvedValue(1),
}));

vi.mock("./push/send", () => ({ sendPushToUser }));

import { notify } from "./notify";

const invoiceData = {
  invoice_id: "inv-1",
  number: "2026-0142",
  amount: "60,00 €",
};

describe("notify", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpsert.mockResolvedValue({ error: null });
    sendInvoiceEmail.mockResolvedValue(undefined);
  });

  it("insère la notification in-app avec titre, lien et actions figés", async () => {
    await notify(
      "invoice_available",
      [{ userId: "u1", email: "a@b.fr" }],
      invoiceData
    );

    expect(mockFrom).toHaveBeenCalledWith("notifications");
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "u1",
        type: "invoice_available",
        category: "transactional",
        title: "Votre facture est disponible",
        body: "Facture 2026-0142, 60,00 €.",
        href: "/espace-client/factures",
        actions: [{ label: "Télécharger", href: "/api/invoices/inv-1/pdf" }],
        dedupe_key: null,
      }),
      expect.anything()
    );
  });

  it("appelle l'adaptateur email avec l'adresse du destinataire", async () => {
    await notify(
      "invoice_available",
      [{ userId: "u1", email: "a@b.fr" }],
      invoiceData
    );
    expect(sendInvoiceEmail).toHaveBeenCalledWith("a@b.fr", invoiceData);
  });

  it("n'envoie pas d'email quand le destinataire n'a pas d'adresse", async () => {
    await notify("invoice_available", [{ userId: "u1" }], invoiceData);
    expect(sendInvoiceEmail).not.toHaveBeenCalled();
    expect(mockUpsert).toHaveBeenCalledTimes(1);
  });

  it("construit une clé de déduplication quand dedupeId est fourni", async () => {
    await notify("invoice_available", [{ userId: "u1" }], invoiceData, {
      dedupeId: "inv-1",
    });
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ dedupe_key: "invoice_available:u1:inv-1" }),
      { onConflict: "dedupe_key", ignoreDuplicates: true }
    );
  });

  it("n'envoie pas l'email quand l'appel restreint les canaux à l'in-app", async () => {
    await notify(
      "invoice_available",
      [{ userId: "u1", email: "a@b.fr" }],
      invoiceData,
      { channels: ["in_app"] }
    );
    expect(mockUpsert).toHaveBeenCalledTimes(1);
    expect(sendInvoiceEmail).not.toHaveBeenCalled();
  });

  it("ne peut pas ajouter un canal que le catalogue ne déclare pas", async () => {
    await notify("admin_message", [{ userId: "u1", email: "a@b.fr" }], {}, {
      channels: ["in_app", "email"],
    });
    expect(mockUpsert).toHaveBeenCalledTimes(1);
    expect(sendInvoiceEmail).not.toHaveBeenCalled();
  });

  it("garde la notification in-app quand l'email échoue", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    sendInvoiceEmail.mockRejectedValue(new Error("Resend down"));

    await expect(
      notify("invoice_available", [{ userId: "u1", email: "a@b.fr" }], invoiceData)
    ).resolves.toBeUndefined();

    expect(mockUpsert).toHaveBeenCalledTimes(1);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("ne lève pas quand l'insertion échoue", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockUpsert.mockResolvedValue({ error: { message: "DB down" } });

    await expect(
      notify("admin_message", [{ userId: "u1" }], {})
    ).resolves.toBeUndefined();

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("traite chaque destinataire, un échec n'empêche pas les suivants", async () => {
    mockUpsert
      .mockResolvedValueOnce({ error: { message: "DB down" } })
      .mockResolvedValueOnce({ error: null });
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await notify("admin_message", [{ userId: "u1" }, { userId: "u2" }], {});

    expect(mockUpsert).toHaveBeenCalledTimes(2);
    consoleSpy.mockRestore();
  });
});

/**
 * `replay_published` n'existe que dans le catalogue simulé ci-dessus : il
 * rejoint le vrai catalogue, et donc `NotificationDataMap`, à la tâche 11. Cet
 * alias laisse les tests de préférence s'appuyer dessus sans créer une entrée
 * à moitié dans le catalogue réel.
 */
const notifyUntyped = notify as unknown as (
  event: string,
  recipients: {
    userId: string;
    email?: string | null;
    unsubscribeToken?: string | null;
  }[],
  data: Record<string, unknown>,
  options?: Record<string, unknown>
) => Promise<void>;

describe("notify et les préférences", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpsert.mockResolvedValue({ error: null });
    sendReplayEmail.mockResolvedValue(undefined);
    loadPreferences.mockResolvedValue({});
  });

  it("ne lit pas les préférences pour un événement transactionnel", async () => {
    await notify("invoice_available", [{ userId: "u1", email: "a@b.fr" }], {
      invoice_id: "i1",
      number: "2026-0142",
      amount: "60,00 €",
    });
    expect(loadPreferences).not.toHaveBeenCalled();
  });

  it("lit les préférences pour un événement marketing", async () => {
    await notifyUntyped("replay_published", [{ userId: "u1", email: "a@b.fr" }], {});
    expect(loadPreferences).toHaveBeenCalledWith("u1");
  });

  it("respecte une coupure du canal email sur un événement marketing", async () => {
    loadPreferences.mockResolvedValue({ "replays:email": false });

    await notifyUntyped("replay_published", [{ userId: "u1", email: "a@b.fr" }], {});

    expect(mockUpsert).toHaveBeenCalledTimes(1);
    expect(sendReplayEmail).not.toHaveBeenCalled();
  });

  it("n'insère rien quand les deux canaux sont coupés", async () => {
    loadPreferences.mockResolvedValue({
      "replays:email": false,
      "replays:in_app": false,
    });

    await notifyUntyped("replay_published", [{ userId: "u1", email: "a@b.fr" }], {});

    expect(mockUpsert).not.toHaveBeenCalled();
    expect(sendReplayEmail).not.toHaveBeenCalled();
  });

  it("lit les préférences de chaque destinataire séparément", async () => {
    loadPreferences
      .mockResolvedValueOnce({ "replays:email": false })
      .mockResolvedValueOnce({});

    await notifyUntyped(
      "replay_published",
      [
        { userId: "u1", email: "a@b.fr" },
        { userId: "u2", email: "c@d.fr" },
      ],
      {}
    );

    expect(sendReplayEmail).toHaveBeenCalledTimes(1);
    expect(sendReplayEmail).toHaveBeenCalledWith("c@d.fr", {});
  });
});

describe("notify et le lien de désinscription", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpsert.mockResolvedValue({ error: null });
    sendReplayEmail.mockResolvedValue(undefined);
    sendInvoiceEmail.mockResolvedValue(undefined);
    loadPreferences.mockResolvedValue({});
  });

  it("ajoute un lien de désinscription porteur du jeton sur un email marketing", async () => {
    await notifyUntyped(
      "replay_published",
      [{ userId: "u1", email: "a@b.fr", unsubscribeToken: "tok-1" }],
      { title: "Atelier de juillet" }
    );

    const [, payload] = sendReplayEmail.mock.calls[0];
    expect(payload.unsubscribe_url).toContain("token=tok-1");
    expect(payload.unsubscribe_url).toContain("categorie=replays");
  });

  it("n'ajoute pas de lien de désinscription sur un email transactionnel", async () => {
    await notify(
      "invoice_available",
      [{ userId: "u1", email: "a@b.fr", unsubscribeToken: "tok-1" }],
      invoiceData
    );

    const [, payload] = sendInvoiceEmail.mock.calls[0];
    expect(payload.unsubscribe_url).toBeUndefined();
  });

  it("se passe du lien quand le destinataire n'a pas de jeton", async () => {
    await notifyUntyped("replay_published", [{ userId: "u1", email: "a@b.fr" }], {
      title: "Atelier de juillet",
    });

    const [, payload] = sendReplayEmail.mock.calls[0];
    expect(payload.unsubscribe_url).toBeUndefined();
  });
});

describe("notify et le canal push", () => {
  const reminderData = {
    booking_id: "b1",
    time: "10h",
    client_name: "Léa",
    consultant_name: "Carole",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUpsert.mockResolvedValue({ error: null });
    sendPushToUser.mockResolvedValue(1);
    loadPreferences.mockResolvedValue({});
  });

  it("pousse un événement imposé qui déclare le canal", async () => {
    await notify("booking_reminder", [{ userId: "u1" }], reminderData);

    expect(sendPushToUser).toHaveBeenCalledWith(
      "u1",
      expect.objectContaining({
        title: "Rappel : consultation demain à 10h",
        href: "/espace-client/reservations",
      })
    );
  });

  it("ne pousse pas un événement qui ne déclare pas le canal", async () => {
    await notify("admin_message", [{ userId: "u1" }], {});
    expect(sendPushToUser).not.toHaveBeenCalled();
  });

  it("respecte le défaut coupé d'une catégorie optionnelle", async () => {
    await notifyUntyped("replay_published", [{ userId: "u1" }], {});
    expect(sendPushToUser).not.toHaveBeenCalled();
  });

  it("pousse une catégorie optionnelle quand la préférence l'autorise", async () => {
    loadPreferences.mockResolvedValue({ "replays:push": true });

    await notifyUntyped("replay_published", [{ userId: "u1" }], {});

    expect(sendPushToUser).toHaveBeenCalledTimes(1);
  });

  it("reprend l'identifiant de déduplication dans le tag", async () => {
    await notify("booking_reminder", [{ userId: "u1" }], reminderData, {
      dedupeId: "b1",
    });

    expect(sendPushToUser).toHaveBeenCalledWith(
      "u1",
      expect.objectContaining({ tag: "booking_reminder:b1" })
    );
  });

  it("garde la notification in-app quand le push échoue", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    sendPushToUser.mockRejectedValue(new Error("web-push down"));

    await expect(
      notify("booking_reminder", [{ userId: "u1" }], reminderData)
    ).resolves.toBeUndefined();

    expect(mockUpsert).toHaveBeenCalledTimes(1);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("n'ajoute pas le push quand l'appel restreint les canaux", async () => {
    await notify("booking_reminder", [{ userId: "u1" }], reminderData, {
      channels: ["in_app"],
    });

    expect(sendPushToUser).not.toHaveBeenCalled();
  });
});
