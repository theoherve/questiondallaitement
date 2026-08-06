import { Resend } from "resend";
import { applyEmailBranding } from "@/lib/emails/branding";
import { getEmailBranding } from "@/lib/emails/branding-store";

let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

const DEFAULT_FROM =
  process.env.RESEND_FROM ??
  `${process.env.RESEND_FROM_NAME ?? "Question d'Allaitement"} <${process.env.RESEND_FROM_EMAIL ?? "noreply@formation-allaitement.com"}>`;

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
  from = DEFAULT_FROM,
  attachments,
  branded = true,
}: SendEmailParams) => {
  const resend = getResend();
  const finalHtml = branded
    ? applyEmailBranding(html, await getEmailBranding())
    : html;
  const { data, error } = await resend.emails.send({
    from,
    to,
    subject,
    html: finalHtml,
    ...(attachments?.length ? { attachments } : {}),
  });

  if (error) {
    console.error("Resend error:", error);
    throw new Error(`Failed to send email: ${error.message} (from: ${from})`);
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
