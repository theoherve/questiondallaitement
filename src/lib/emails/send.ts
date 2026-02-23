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
