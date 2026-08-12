import { describe, it, expect } from "vitest";
import { buildInvoicesCsv, type InvoiceExportRow } from "./csv-export";

const row = (overrides: Partial<InvoiceExportRow> = {}): InvoiceExportRow => ({
  number: "2026-08-0001",
  issued_at: "2026-08-01T10:00:00.000Z",
  document_type: "invoice",
  status: "issued",
  payment_status: "paid",
  client_name: "Marie Dupont",
  amount_ht_cents: 10000,
  amount_vat_cents: 2000,
  amount_ttc_cents: 12000,
  currency: "eur",
  settlements: [],
  ...overrides,
});

describe("buildInvoicesCsv", () => {
  it("produit un en-tete et une ligne par facture, separees par point-virgule", () => {
    const csv = buildInvoicesCsv([row()]);
    const [header, line] = csv.split("\n");
    expect(header).toBe(
      "Numéro;Date d'émission;Type;Statut document;Statut règlement;Cliente;Montant HT;Montant TVA;Montant TTC;Devise;Règlements",
    );
    expect(line).toBe(
      "2026-08-0001;2026-08-01T10:00:00.000Z;invoice;issued;paid;Marie Dupont;100.00;20.00;120.00;eur;",
    );
  });

  it("resume les reglements dans une seule cellule", () => {
    const csv = buildInvoicesCsv([
      row({
        payment_status: "partial",
        settlements: [
          { method: "transfer", amount_cents: 5000, paid_at: "2026-08-05T00:00:00.000Z" },
          { method: "cash", amount_cents: 2000, paid_at: "2026-08-10T00:00:00.000Z" },
        ],
      }),
    ]);
    const [, line] = csv.split("\n");
    expect(line).toContain(
      "transfer 50.00 (2026-08-05T00:00:00.000Z) | cash 20.00 (2026-08-10T00:00:00.000Z)",
    );
  });

  it("echappe les cellules contenant un point-virgule ou des guillemets", () => {
    const csv = buildInvoicesCsv([row({ client_name: 'Dupont; "Marie"' })]);
    const [, line] = csv.split("\n");
    expect(line).toContain('"Dupont; ""Marie"""');
  });

  it("ne produit que l'en-tete pour une liste vide", () => {
    const csv = buildInvoicesCsv([]);
    expect(csv.split("\n")).toHaveLength(1);
  });
});
