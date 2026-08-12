import { sendTransactionalEmail } from "@/lib/resend/client";
import { renderGiftCardPdf } from "./pdf";

export type GiftCardEmailInput = {
  code: string;
  typeLabel: string;
  amountLabel: string | null;
  expiresAtLabel: string;
  buyerName: string;
  buyerEmail: string;
  beneficiaryName: string | null;
  beneficiaryEmail: string | null;
  personalMessage: string | null;
  deliveryMode: "email" | "pdf";
  consultantName: string;
};

export const sendGiftCardPurchaseEmails = async (
  input: GiftCardEmailInput,
): Promise<void> => {
  const pdfView = {
    code: input.code,
    typeLabel: input.typeLabel,
    amountLabel: input.amountLabel,
    expiresAtLabel: input.expiresAtLabel,
    beneficiaryName: input.beneficiaryName,
    personalMessage: input.personalMessage,
    consultantName: input.consultantName,
  };

  const buyerHtml = `
    <p>Bonjour ${input.buyerName},</p>
    <p>Votre carte cadeau <strong>${input.code}</strong> est confirmée.</p>
    <p>${input.typeLabel}${input.amountLabel ? ` — ${input.amountLabel}` : ""}</p>
    <p>Valable jusqu'au ${input.expiresAtLabel}.</p>
  `;

  if (input.deliveryMode === "pdf") {
    const pdf = await renderGiftCardPdf(pdfView);
    await sendTransactionalEmail({
      to: input.buyerEmail,
      subject: "Votre carte cadeau",
      html: buyerHtml,
      attachments: [{ filename: `${input.code}.pdf`, content: pdf }],
    });
    return;
  }

  await sendTransactionalEmail({
    to: input.buyerEmail,
    subject: "Votre carte cadeau",
    html: buyerHtml,
  });

  if (input.beneficiaryEmail) {
    const beneficiaryHtml = `
      <p>Bonjour ${input.beneficiaryName ?? ""},</p>
      <p>${input.buyerName} vous offre une carte cadeau.</p>
      <p>Votre code : <strong>${input.code}</strong></p>
      <p>${input.typeLabel}${input.amountLabel ? ` — ${input.amountLabel}` : ""}</p>
      <p>Valable jusqu'au ${input.expiresAtLabel}.</p>
      ${input.personalMessage ? `<p><em>${input.personalMessage}</em></p>` : ""}
    `;

    await sendTransactionalEmail({
      to: input.beneficiaryEmail,
      subject: `${input.buyerName} vous offre une carte cadeau`,
      html: beneficiaryHtml,
    });
  }
};
