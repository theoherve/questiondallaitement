import { Resend } from "resend";

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
};

export const sendTransactionalEmail = async ({
  to,
  subject,
  html,
  from = DEFAULT_FROM,
  attachments,
}: SendEmailParams) => {
  const resend = getResend();
  const { data, error } = await resend.emails.send({
    from,
    to,
    subject,
    html,
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
