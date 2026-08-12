import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSend = vi.fn();
vi.mock("@/lib/resend/client", () => ({
  sendTransactionalEmail: (...args: unknown[]) => mockSend(...args),
}));

const mockRenderPdf = vi.fn(async () => Buffer.from("pdf-bytes"));
vi.mock("./pdf", () => ({
  renderGiftCardPdf: (...args: unknown[]) => mockRenderPdf(...args),
}));

import { sendGiftCardPurchaseEmails, type GiftCardEmailInput } from "./emails";

const baseInput: GiftCardEmailInput = {
  code: "CADEAU-ABC234",
  typeLabel: "Carte cadeau — 90 €",
  amountLabel: "90,00 €",
  expiresAtLabel: "12 août 2027",
  buyerName: "Jean Martin",
  buyerEmail: "jean@example.com",
  beneficiaryName: null,
  beneficiaryEmail: null,
  personalMessage: null,
  deliveryMode: "email",
  consultantName: "Carole Hervé",
};

describe("sendGiftCardPurchaseEmails", () => {
  beforeEach(() => {
    mockSend.mockClear();
    mockRenderPdf.mockClear();
  });

  it("always sends a confirmation email to the buyer", async () => {
    await sendGiftCardPurchaseEmails(baseInput);

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({ to: "jean@example.com" }),
    );
  });

  it("sends a second email with the code when delivery_mode=email and a beneficiary is set", async () => {
    await sendGiftCardPurchaseEmails({
      ...baseInput,
      beneficiaryName: "Marie Dupont",
      beneficiaryEmail: "marie@example.com",
    });

    expect(mockSend).toHaveBeenCalledTimes(2);
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({ to: "marie@example.com" }),
    );
  });

  it("does not send a beneficiary email when delivery_mode=email but no beneficiary email is set", async () => {
    await sendGiftCardPurchaseEmails(baseInput);
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it("attaches the PDF to the buyer email when delivery_mode=pdf", async () => {
    await sendGiftCardPurchaseEmails({ ...baseInput, deliveryMode: "pdf" });

    expect(mockRenderPdf).toHaveBeenCalledTimes(1);
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "jean@example.com",
        attachments: [
          expect.objectContaining({ filename: expect.stringContaining("CADEAU-ABC234") }),
        ],
      }),
    );
  });

  it("does not send a beneficiary email when delivery_mode=pdf", async () => {
    await sendGiftCardPurchaseEmails({
      ...baseInput,
      deliveryMode: "pdf",
      beneficiaryEmail: "marie@example.com",
    });
    expect(mockSend).toHaveBeenCalledTimes(1);
  });
});
