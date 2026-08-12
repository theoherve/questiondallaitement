import { describe, it, expect } from "vitest";
import { renderGiftCardPdf, type GiftCardPdfView } from "./pdf";

describe("renderGiftCardPdf", () => {
  it("renders a non-empty PDF buffer", async () => {
    const view: GiftCardPdfView = {
      code: "CADEAU-ABC234",
      typeLabel: "Carte cadeau — 90 €",
      amountLabel: "90,00 €",
      expiresAtLabel: "12 août 2027",
      beneficiaryName: "Marie Dupont",
      personalMessage: "Joyeux anniversaire !",
      consultantName: "Carole Hervé",
    };

    const buffer = await renderGiftCardPdf(view);

    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(0);
    // En-tête PDF standard.
    expect(buffer.subarray(0, 5).toString()).toBe("%PDF-");
  });
});
