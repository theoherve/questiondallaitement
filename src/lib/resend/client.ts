import { Resend } from "resend";

export const resend = new Resend(process.env.RESEND_API_KEY);

type SendEmailParams = {
  to: string;
  subject: string;
  html: string;
  from?: string;
};

export const sendTransactionalEmail = async ({
  to,
  subject,
  html,
  from = "Question d'Allaitement <noreply@questiondallaitement.com>",
}: SendEmailParams) => {
  const { data, error } = await resend.emails.send({
    from,
    to,
    subject,
    html,
  });

  if (error) {
    console.error("Resend error:", error);
    throw new Error(`Failed to send email: ${error.message}`);
  }

  return data;
};

export const renderTemplate = (
  template: string,
  variables: Record<string, string>
): string => {
  let rendered = template;
  for (const [key, value] of Object.entries(variables)) {
    rendered = rendered.replaceAll(`{{${key}}}`, value);
  }
  return rendered;
};
