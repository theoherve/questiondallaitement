import { sendTransactionalEmail } from "@/lib/resend/client";
import { siteConfig } from "@/config/site";
import { buildInvoiceView, type InvoiceRecord } from "./invoice-view";
import { renderInvoicePdf } from "./invoice-pdf";

/** Facture telle que renvoyee par `create_invoice`, plus son identifiant. */
export type InvoiceEmailRecord = InvoiceRecord & {
  id: string;
  client_email: string;
};

/**
 * Envoie la facture a la cliente : lien vers son espace **et** PDF en piece
 * jointe (les deux, choix acte). Leve en cas d'echec — l'appelant decide s'il
 * bloque (renvoi manuel) ou non (envoi automatique a l'emission).
 */
export const sendInvoiceEmail = async (
  record: InvoiceEmailRecord,
): Promise<void> => {
  const view = buildInvoiceView(record);
  const pdf = await renderInvoicePdf(view);
  const invoiceUrl = `${siteConfig.url}/factures/${record.id}`;
  const firstName = record.client_name.split(" ")[0] ?? "";

  const html = `
    <p>Bonjour ${firstName},</p>
    <p>Vous trouverez ci-joint votre facture <strong>n° ${view.number}</strong>
    (${view.ttc}), également consultable dans votre espace :</p>
    <p><a href="${invoiceUrl}">Consulter ma facture</a></p>
    <p>Avec toute notre attention,<br/>${view.issuer.legalName}</p>
  `;

  await sendTransactionalEmail({
    to: record.client_email,
    subject: `Votre facture n° ${view.number}`,
    html,
    attachments: [{ filename: `Facture-${view.number}.pdf`, content: pdf }],
  });
};
