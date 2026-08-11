import { Resend } from "resend";
import { applyEmailBranding } from "@/lib/emails/branding";
import { getEmailBranding } from "@/lib/emails/branding-store";
import { getEmailSender } from "@/lib/settings/email-sender/store";

let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

export type EmailAttachment = {
  filename: string;
  /** Contenu binaire de la piece jointe. */
  content: Buffer;
};

type SendEmailParams = {
  to: string;
  subject: string;
  html: string;
  from?: string;
  attachments?: EmailAttachment[];
  /**
   * Mettre a false pour envoyer le HTML tel quel, sans logo d'en-tete ni pied
   * de page. Reserve aux cas ou l'habillage nuit (export, debug).
   */
  branded?: boolean;
};

/**
 * Point de passage unique de tous les envois transactionnels — c'est donc ici
 * qu'on applique l'identite visuelle (logo, pied de page), y compris pour les
 * emails de repli ecrits en dur dans `send.ts`, qui ne passent pas par un
 * template. Un changement de logo dans l'administration prend effet au
 * prochain envoi, sans toucher aux templates.
 */
export const sendTransactionalEmail = async ({
  to,
  subject,
  html,
  from,
  attachments,
  branded = true,
}: SendEmailParams) => {
  const resend = getResend();
  const finalHtml = branded
    ? applyEmailBranding(html, await getEmailBranding())
    : html;

  let finalFrom = from ?? process.env.RESEND_FROM;
  if (!finalFrom) {
    const sender = await getEmailSender();
    finalFrom = `${sender.from_name} <${sender.from_address}>`;
  }

  const { data, error } = await resend.emails.send({
    from: finalFrom,
    to,
    subject,
    html: finalHtml,
    ...(attachments?.length ? { attachments } : {}),
  });

  if (error) {
    console.error("Resend error:", error);
    throw new Error(`Failed to send email: ${error.message} (from: ${finalFrom})`);
  }

  return data;
};

export const renderTemplate = (
  template: string,
  variables: Record<string, string>,
): string => {
  let rendered = template;
  for (const [key, value] of Object.entries(variables)) {
    rendered = rendered.replaceAll(`{{${key}}}`, value);
  }
  return rendered;
};
