import { sendTransactionalEmail, renderTemplate } from "@/lib/resend/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveEmailHtml } from "@/lib/emails/render-block-email";

type TemplateRow = {
  subject: string;
  body_html: string;
  body_design: Record<string, unknown> | null;
};

const getTemplate = async (templateName: string): Promise<TemplateRow | null> => {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("email_templates")
    .select("subject, body_html, body_design")
    .eq("name", templateName)
    .single();

  return data as TemplateRow | null;
};

/**
 * Render a template row with variables, picking block design over legacy HTML.
 */
const renderTemplateRow = async (
  tpl: TemplateRow,
  variables: Record<string, string>,
): Promise<{ subject: string; html: string }> => ({
  subject: renderTemplate(tpl.subject, variables),
  html: await resolveEmailHtml(tpl.body_design, tpl.body_html, variables),
});

/**
 * Bouton « Rejoindre la reunion Zoom », ou chaine vide hors teleconsultation.
 *
 * Le fragment doit rester **inline** : il est injecte dans un paragraphe du
 * design, et un <p> imbrique dans un <p> est du HTML invalide que les clients
 * mail corrigent en refermant le paragraphe exterieur — ce qui casse
 * l'espacement de tout ce qui suit.
 */
export const buildZoomBlock = (zoomJoinUrl?: string): string =>
  zoomJoinUrl
    ? `<a href="${zoomJoinUrl}" style="display:inline-block;margin-top:16px;padding:12px 24px;background-color:#a0283e;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600;">Rejoindre la réunion Zoom</a>`
    : "";

export const sendBookingConfirmation = async (
  clientEmail: string,
  variables: {
    client_name: string;
    consultant_name: string;
    date: string;
    time: string;
    zoom_join_url?: string;
  },
) => {
  const template = await getTemplate("booking_confirmation");
  if (!template) return;

  const zoom_block = buildZoomBlock(variables.zoom_join_url);

  const { subject, html } = await renderTemplateRow(template, {
    client_name: variables.client_name,
    consultant_name: variables.consultant_name,
    date: variables.date,
    time: variables.time,
    zoom_block,
  });

  await sendTransactionalEmail({ to: clientEmail, subject, html });
};

export const sendBookingConfirmedToConsultant = async (
  consultantEmail: string,
  variables: {
    consultant_name: string;
    client_name: string;
    date: string;
    time: string;
    zoom_host_url?: string;
  },
) => {
  const zoomBlock = variables.zoom_host_url
    ? `<p style="margin-top:16px;"><a href="${variables.zoom_host_url}" style="display:inline-block;padding:12px 24px;background-color:#A0283E;color:#fff;text-decoration:none;border-radius:6px;">Démarrer la réunion Zoom</a></p>`
    : "";

  await sendTransactionalEmail({
    to: consultantEmail,
    subject: `Réservation confirmée — ${variables.client_name} le ${variables.date}`,
    html: `
      <h1>Réservation confirmée</h1>
      <p>Bonjour ${variables.consultant_name},</p>
      <p>Une nouvelle réservation a été confirmée et payée :</p>
      <ul>
        <li><strong>Client :</strong> ${variables.client_name}</li>
        <li><strong>Date :</strong> ${variables.date} à ${variables.time}</li>
      </ul>
      ${zoomBlock}
      <p>Connectez-vous à votre espace pour voir tous les détails.</p>
    `,
  });
};

export const sendBookingReminder = async (
  clientEmail: string,
  variables: {
    client_name: string;
    consultant_name: string;
    time: string;
  },
) => {
  const template = await getTemplate("booking_reminder");
  if (!template) return;

  const { subject, html } = await renderTemplateRow(template, variables);
  await sendTransactionalEmail({ to: clientEmail, subject, html });
};

export const sendBookingCancelled = async (
  clientEmail: string,
  variables: {
    client_name: string;
    date: string;
    refund_info: string;
  },
) => {
  const template = await getTemplate("booking_cancelled");
  if (!template) return;

  const { subject, html } = await renderTemplateRow(template, variables);
  await sendTransactionalEmail({ to: clientEmail, subject, html });
};

export const sendFormationAccess = async (
  clientEmail: string,
  variables: {
    client_name: string;
    formation_title: string;
    access_url?: string;
    is_new_account?: boolean;
  },
) => {
  const template = await getTemplate("formation_access");
  if (!template) return;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const accessUrl = variables.access_url ?? `${siteUrl}/espace-client/accompagnements`;
  const { subject, html } = await renderTemplateRow(template, {
    client_name: variables.client_name,
    formation_title: variables.formation_title,
    access_url: accessUrl,
    // Legacy var retained for back-compat with older template copies.
    formation_url: accessUrl,
    is_new_account: variables.is_new_account ? "true" : "false",
  });
  await sendTransactionalEmail({ to: clientEmail, subject, html });
};

export const sendWelcomeEmail = async (
  clientEmail: string,
  variables: {
    client_name: string;
  },
) => {
  const template = await getTemplate("welcome");
  if (!template) return;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const { subject, html } = await renderTemplateRow(template, {
    ...variables,
    dashboard_url: `${siteUrl}/espace-client`,
  });
  await sendTransactionalEmail({ to: clientEmail, subject, html });
};

export const sendNewBookingNotification = async (
  consultantEmail: string,
  variables: {
    consultant_name: string;
    client_name: string;
    date: string;
    time: string;
    reason: string;
    payment_method: string;
  },
) => {
  const template = await getTemplate("new_booking_notification");

  if (template) {
    const { subject, html } = await renderTemplateRow(template, variables);
    await sendTransactionalEmail({ to: consultantEmail, subject, html });
    return;
  }

  await sendTransactionalEmail({
    to: consultantEmail,
    subject: `Nouvelle réservation de ${variables.client_name}`,
    html: `
      <h1>Nouvelle réservation</h1>
      <p>Bonjour ${variables.consultant_name},</p>
      <p>Vous avez une nouvelle réservation :</p>
      <ul>
        <li><strong>Client :</strong> ${variables.client_name}</li>
        <li><strong>Date :</strong> ${variables.date} à ${variables.time}</li>
        <li><strong>Motif :</strong> ${variables.reason}</li>
        <li><strong>Paiement :</strong> ${variables.payment_method}</li>
      </ul>
      <p>Connectez-vous à votre espace pour gérer cette réservation.</p>
    `,
  });
};

export const sendGuestAccountEmail = async (
  clientEmail: string,
  variables: {
    client_name: string;
    setup_url: string;
  },
) => {
  const template = await getTemplate("guest_account_setup");

  if (template) {
    const { subject, html } = await renderTemplateRow(template, variables);
    await sendTransactionalEmail({ to: clientEmail, subject, html });
    return;
  }

  await sendTransactionalEmail({
    to: clientEmail,
    subject: "Finalisez votre compte — Question d'Allaitement",
    html: `
      <h1>Bienvenue sur Question d'Allaitement</h1>
      <p>Bonjour ${variables.client_name},</p>
      <p>Votre réservation a été enregistrée. Un compte a été créé automatiquement pour vous.</p>
      <p>Pour accéder à votre espace personnel et suivre vos rendez-vous, définissez votre mot de passe :</p>
      <p><a href="${variables.setup_url}" style="display:inline-block;padding:12px 24px;background-color:#A0283E;color:#fff;text-decoration:none;border-radius:6px;">Créer mon mot de passe</a></p>
      <p>Si vous n'avez pas effectué cette réservation, ignorez cet email.</p>
    `,
  });
};

export const sendBookingCancelledToConsultant = async (
  consultantEmail: string,
  variables: {
    consultant_name: string;
    client_name: string;
    date: string;
    reason: string;
  },
) => {
  const subject = `Annulation de rendez-vous — ${variables.client_name}`;
  const html = `
    <h1>Rendez-vous annulé</h1>
    <p>Bonjour ${variables.consultant_name},</p>
    <p>Le rendez-vous avec ${variables.client_name} prévu le ${variables.date} a été annulé.</p>
    <p><strong>Raison :</strong> ${variables.reason}</p>
  `;

  await sendTransactionalEmail({ to: consultantEmail, subject, html });
};

export const sendVerificationEmail = async (
  clientEmail: string,
  variables: {
    client_name: string;
    verification_url: string;
  },
) => {
  const template = await getTemplate("email_verification");

  if (template) {
    const { subject, html } = await renderTemplateRow(template, variables);
    await sendTransactionalEmail({ to: clientEmail, subject, html });
    return;
  }

  await sendTransactionalEmail({
    to: clientEmail,
    subject: "Confirmez votre adresse email",
    html: `
      <h1>Confirmez votre adresse email</h1>
      <p>Bonjour ${variables.client_name},</p>
      <p>Merci de vous être inscrit(e) sur Question d'Allaitement.</p>
      <p>Pour activer votre compte, veuillez confirmer votre adresse email en cliquant sur le bouton ci-dessous :</p>
      <p><a href="${variables.verification_url}" style="display:inline-block;padding:12px 24px;background-color:#A0283E;color:#fff;text-decoration:none;border-radius:6px;">Confirmer mon email</a></p>
      <p>Ce lien est valide pendant 24 heures.</p>
      <p>Si vous n'avez pas créé de compte, ignorez cet email.</p>
    `,
  });
};

export const sendBlogPostPublishedNotification = async (
  adminEmails: string[],
  variables: {
    post_titles: string[];
    post_count: number;
  },
) => {
  const postList = variables.post_titles
    .map((t) => `<li>${t}</li>`)
    .join("");

  const subject =
    variables.post_count === 1
      ? `Article publié automatiquement : ${variables.post_titles[0]}`
      : `${variables.post_count} articles publiés automatiquement`;

  const html = `
    <h1>Publication automatique</h1>
    <p>Les articles suivants viennent d'être publiés automatiquement :</p>
    <ul>${postList}</ul>
    <p>Connectez-vous à l'espace admin pour les consulter.</p>
  `;

  for (const email of adminEmails) {
    try {
      await sendTransactionalEmail({ to: email, subject, html });
    } catch (err) {
      console.error(`Failed to notify admin ${email}:`, err);
    }
  }
};

export const sendMigrationWelcomeEmail = async (
  clientEmail: string,
  variables: {
    client_name: string;
    setup_url: string;
  },
) => {
  const template = await getTemplate("migration_welcome");

  if (template) {
    const { subject, html } = await renderTemplateRow(template, variables);
    await sendTransactionalEmail({ to: clientEmail, subject, html });
    return;
  }

  await sendTransactionalEmail({
    to: clientEmail,
    subject: "Votre espace Question d'Allaitement a migré",
    html: `
      <h1>Bienvenue sur votre nouvel espace</h1>
      <p>Bonjour ${variables.client_name},</p>
      <p>Votre compte Question d'Allaitement a été transféré vers notre nouvelle plateforme.</p>
      <p>Pour accéder à votre espace personnel, définissez votre mot de passe en cliquant ci-dessous :</p>
      <p><a href="${variables.setup_url}" style="display:inline-block;padding:12px 24px;background-color:#A0283E;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">Activer mon compte</a></p>
      <p>Ce lien est valide pendant 72 heures. Passé ce délai, cliquez sur « Mot de passe oublié » depuis la page de connexion.</p>
      <p>À très bientôt,<br>L'équipe Question d'Allaitement</p>
    `,
  });
};

export const sendPasswordResetEmail = async (
  clientEmail: string,
  variables: {
    client_name: string;
    reset_url: string;
  },
) => {
  const template = await getTemplate("password_reset");

  if (template) {
    const { subject, html } = await renderTemplateRow(template, variables);
    await sendTransactionalEmail({ to: clientEmail, subject, html });
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
