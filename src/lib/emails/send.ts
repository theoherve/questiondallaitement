import { sendTransactionalEmail, renderTemplate } from "@/lib/resend/client";
import { createAdminClient } from "@/lib/supabase/admin";

const getTemplate = async (templateName: string) => {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("email_templates")
    .select("subject, body_html")
    .eq("name", templateName)
    .single();

  return data;
};

export const sendBookingConfirmation = async (
  clientEmail: string,
  variables: {
    client_name: string;
    consultant_name: string;
    date: string;
    time: string;
  }
) => {
  const template = await getTemplate("booking_confirmation");
  if (!template) return;

  await sendTransactionalEmail({
    to: clientEmail,
    subject: renderTemplate(template.subject, variables),
    html: renderTemplate(template.body_html, variables),
  });
};

export const sendBookingReminder = async (
  clientEmail: string,
  variables: {
    client_name: string;
    consultant_name: string;
    time: string;
  }
) => {
  const template = await getTemplate("booking_reminder");
  if (!template) return;

  await sendTransactionalEmail({
    to: clientEmail,
    subject: renderTemplate(template.subject, variables),
    html: renderTemplate(template.body_html, variables),
  });
};

export const sendBookingCancelled = async (
  clientEmail: string,
  variables: {
    client_name: string;
    date: string;
    refund_info: string;
  }
) => {
  const template = await getTemplate("booking_cancelled");
  if (!template) return;

  await sendTransactionalEmail({
    to: clientEmail,
    subject: renderTemplate(template.subject, variables),
    html: renderTemplate(template.body_html, variables),
  });
};

export const sendFormationAccess = async (
  clientEmail: string,
  variables: {
    client_name: string;
    formation_title: string;
  }
) => {
  const template = await getTemplate("formation_access");
  if (!template) return;

  await sendTransactionalEmail({
    to: clientEmail,
    subject: renderTemplate(template.subject, variables),
    html: renderTemplate(template.body_html, variables),
  });
};

export const sendWelcomeEmail = async (
  clientEmail: string,
  variables: {
    client_name: string;
  }
) => {
  const template = await getTemplate("welcome");
  if (!template) return;

  await sendTransactionalEmail({
    to: clientEmail,
    subject: renderTemplate(template.subject, variables),
    html: renderTemplate(template.body_html, variables),
  });
};

export const sendPasswordResetEmail = async (
  clientEmail: string,
  variables: {
    client_name: string;
    reset_url: string;
  }
) => {
  const template = await getTemplate("password_reset");

  if (template) {
    await sendTransactionalEmail({
      to: clientEmail,
      subject: renderTemplate(template.subject, variables),
      html: renderTemplate(template.body_html, variables),
    });
    return;
  }

  await sendTransactionalEmail({
    to: clientEmail,
    subject: "Réinitialisation de votre mot de passe",
    html: `
      <h1>Réinitialisation de mot de passe</h1>
      <p>Bonjour ${variables.client_name},</p>
      <p>Vous avez demandé la réinitialisation de votre mot de passe.</p>
      <p><a href="${variables.reset_url}" style="display:inline-block;padding:12px 24px;background-color:#A0283E;color:#fff;text-decoration:none;border-radius:6px;">Réinitialiser mon mot de passe</a></p>
      <p>Ce lien est valide pendant 24 heures.</p>
      <p>Si vous n'avez pas fait cette demande, ignorez cet email.</p>
    `,
  });
};
