import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSend = vi.fn();
vi.mock("@/lib/resend/client", () => ({
  sendTransactionalEmail: (...args: unknown[]) => mockSend(...args),
}));

const mockRenderPdf = vi.fn(async (..._args: unknown[]) => Buffer.from("pdf-bytes"));
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

import {
  sendGiftCardExpiryReminderEmail,
  sendGiftCardRefundConfirmationEmail,
} from "./emails";

describe("sendGiftCardExpiryReminderEmail", () => {
  beforeEach(() => {
    mockSend.mockClear();
  });

  it("sends a single reminder email to the given recipient", async () => {
    await sendGiftCardExpiryReminderEmail({
      code: "CADEAU-ABC234",
      typeLabel: "Carte cadeau",
      amountLabel: "70,00 €",
      expiresAtLabel: "12 septembre 2026",
      recipientName: "Marie Dupont",
      recipientEmail: "marie@example.com",
    });

    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "marie@example.com",
        subject: expect.stringContaining("expire"),
      }),
    );
  });

  it("includes the code and amount in the email body", async () => {
    await sendGiftCardExpiryReminderEmail({
      code: "CADEAU-ABC234",
      typeLabel: "Carte cadeau",
      amountLabel: "70,00 €",
      expiresAtLabel: "12 septembre 2026",
      recipientName: "Marie Dupont",
      recipientEmail: "marie@example.com",
    });

    const call = mockSend.mock.calls[0][0] as { html: string };
    expect(call.html).toContain("CADEAU-ABC234");
    expect(call.html).toContain("70,00 €");
    expect(call.html).toContain("12 septembre 2026");
  });

  it("sends successfully and renders no stray amount when amountLabel is null (carte 'service')", async () => {
    await sendGiftCardExpiryReminderEmail({
      code: "CADEAU-SERV00",
      typeLabel: "Carte cadeau — prestation offerte",
      amountLabel: null,
      expiresAtLabel: "12 septembre 2026",
      recipientName: "Marie Dupont",
      recipientEmail: "marie@example.com",
    });

    expect(mockSend).toHaveBeenCalledTimes(1);
    const call = mockSend.mock.calls[0][0] as { html: string };
    expect(call.html).not.toContain("null");
    expect(call.html).not.toContain("— null");
    expect(call.html).toContain("Carte cadeau — prestation offerte");
  });
});

describe("sendGiftCardRefundConfirmationEmail", () => {
  beforeEach(() => {
    mockSend.mockClear();
  });

  it("sends a refund confirmation email to the given recipient", async () => {
    await sendGiftCardRefundConfirmationEmail({
      code: "CADEAU-EXPIR0",
      recipientName: "Jean Martin",
      recipientEmail: "jean@example.com",
    });

    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "jean@example.com",
        subject: expect.stringContaining("remboursée"),
      }),
    );
    const call = mockSend.mock.calls[0][0] as { html: string };
    expect(call.html).toContain("CADEAU-EXPIR0");
  });
});
