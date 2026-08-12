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

export type GiftCardExpiryReminderInput = {
  code: string;
  typeLabel: string;
  amountLabel: string | null;
  expiresAtLabel: string;
  recipientName: string;
  recipientEmail: string;
};

export const sendGiftCardExpiryReminderEmail = async (
  input: GiftCardExpiryReminderInput,
): Promise<void> => {
  const html = `
    <p>Bonjour ${input.recipientName},</p>
    <p>Votre carte cadeau <strong>${input.code}</strong> expire le ${input.expiresAtLabel}.</p>
    <p>${input.typeLabel}${input.amountLabel ? ` — ${input.amountLabel}` : ""}</p>
    <p>Pensez à l'utiliser avant cette date.</p>
  `;

  await sendTransactionalEmail({
    to: input.recipientEmail,
    subject: "Votre carte cadeau expire bientôt",
    html,
  });
};

export type GiftCardRefundConfirmationInput = {
  code: string;
  recipientName: string;
  recipientEmail: string;
};

/**
 * Confirme la cloture d'une carte cadeau suite a un remboursement
 * exceptionnel apres expiration (§7.6 Exception 2, design §69). Meme style
 * que `sendGiftCardExpiryReminderEmail` : HTML inline, un seul appel a
 * `sendTransactionalEmail`.
 */
export const sendGiftCardRefundConfirmationEmail = async (
  input: GiftCardRefundConfirmationInput,
): Promise<void> => {
  const html = `
    <p>Bonjour ${input.recipientName},</p>
    <p>Votre carte cadeau <strong>${input.code}</strong> a été remboursée et est désormais close.</p>
    <p>Le virement a été effectué séparément par notre équipe.</p>
  `;

  await sendTransactionalEmail({
    to: input.recipientEmail,
    subject: "Votre carte cadeau a été remboursée",
    html,
  });
};
