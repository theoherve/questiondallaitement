import { describe, it, expect, vi, beforeEach } from "vitest";

const mockUpsert = vi.fn();
const mockFrom = vi.fn(() => ({ upsert: mockUpsert }));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockFrom }),
}));

const sendInvoiceEmail = vi.fn();

vi.mock("./catalog", () => ({
  NOTIFICATION_CATALOG: {
    invoice_available: {
      key: "invoice_available",
      category: "transactional",
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
      channels: ["in_app"],
      title: () => "Message de l'équipe",
    },
  },
}));

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
