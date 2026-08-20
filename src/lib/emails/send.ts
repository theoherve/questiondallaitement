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
    subject: `Réservation confirmée : ${variables.client_name} le ${variables.date}`,
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

/**
 * Le creneau a ete vendu deux fois : la cliente a paye, on l'a remboursee, et
 * elle n'a pas de rendez-vous.
 *
 * Sans cet email elle constate un debit puis un credit qu'elle ne s'explique
 * pas, et croit avoir une consultation reservee. L'envoi est donc obligatoire —
 * pas de repli en dur : si le template manque, on veut le savoir.
 */
export const sendBookingSlotConflict = async (
  clientEmail: string,
  variables: {
    client_name: string;
    date: string;
    time: string;
    amount_refunded: string;
    booking_url: string;
  },
) => {
  const template = await getTemplate("booking_slot_conflict");
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

export const sendAccompagnementAccess = async (
  clientEmail: string,
  variables: {
    client_name: string;
    accompagnement_title: string;
    access_url?: string;
    is_new_account?: boolean;
  },
) => {
  const template = await getTemplate("accompagnement_access");
  if (!template) return;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const accessUrl = variables.access_url ?? `${siteUrl}/espace-client/accompagnements`;
  const { subject, html } = await renderTemplateRow(template, {
    client_name: variables.client_name,
    accompagnement_title: variables.accompagnement_title,
    access_url: accessUrl,
    // Legacy var retained for back-compat with older template copies.
    accompagnement_url: accessUrl,
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
    subject: "Finalisez votre compte : Question d'Allaitement",
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
  const subject = `Annulation de rendez-vous, ${variables.client_name}`;
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

/**
 * Bouton « Télécharger le mémo », ou chaine vide tant qu'aucun fichier n'a ete
 * depose depuis l'administration.
 *
 * Comme `buildZoomBlock`, le fragment reste **inline** : il est injecte dans un
 * paragraphe du design, et un <p> imbrique dans un <p> est du HTML invalide que
 * les clients mail corrigent en refermant le paragraphe exterieur — ce qui
 * casse l'espacement de tout ce qui suit.
 */
export const buildMemoBlock = (memoUrl: string | null): string =>
  memoUrl
    ? `<a href="${memoUrl}" style="display:inline-block;padding:14px 32px;background-color:#a0283e;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600;">Télécharger le mémo</a>`
    : "";

/**
 * Lien de desinscription, obligatoire dans chaque envoi de newsletter.
 *
 * Brevo l'ajoute nativement a ses campagnes ; cet email-ci part par Resend,
 * donc il faut le fournir. Rendu discret pour ne pas concurrencer le contenu,
 * mais jamais absent.
 */
export const buildUnsubscribeLink = (unsubscribeUrl: string): string =>
  `<a href="${unsubscribeUrl}" style="color:#5a6b69;text-decoration:underline;">Se désinscrire</a>`;

export const sendNewsletterWelcome = async (
  subscriberEmail: string,
  variables: {
    first_name: string;
    memo_url: string | null;
    unsubscribe_url: string;
  },
) => {
  const template = await getTemplate("newsletter_welcome");
  if (!template) return false;

  const { subject, html } = await renderTemplateRow(template, {
    first_name: variables.first_name,
    memo_block: buildMemoBlock(variables.memo_url),
    unsubscribe_link: buildUnsubscribeLink(variables.unsubscribe_url),
  });

  await sendTransactionalEmail({ to: subscriberEmail, subject, html });
  return true;
};

/**
 * Annonce d'un nouveau replay d'atelier.
 *
 * Email marketing, donc porteur d'un lien de desinscription : sans lui, l'envoi
 * n'est pas conforme. En HTML en ligne plutot qu'en template edite, comme
 * `sendBookingConfirmedToConsultant` : le contenu ne varie pas.
 */
export const sendReplayPublished = async (
  clientEmail: string,
  variables: { title: string; replay_url: string; unsubscribe_url: string },
) => {
  await sendTransactionalEmail({
    to: clientEmail,
    subject: `Nouveau replay : ${variables.title}`,
    html: `
      <h1>Le replay est en ligne</h1>
      <p>${variables.title} est disponible dans votre espace.</p>
      <p><a href="${variables.replay_url}" style="display:inline-block;padding:12px 24px;background-color:#2F5D50;color:#fff;text-decoration:none;border-radius:6px;">Regarder le replay</a></p>
      <p style="margin-top:32px;font-size:12px;color:#888;">
        Vous recevez cet email parce que vous avez accès aux ateliers mensuels.
        <a href="${variables.unsubscribe_url}">Ne plus recevoir ces annonces</a>.
      </p>
    `,
  });
};

export const sendBlogPostToClients = async (
  clientEmail: string,
  variables: { title: string; post_url: string; unsubscribe_url: string },
) => {
  await sendTransactionalEmail({
    to: clientEmail,
    subject: `Nouvel article : ${variables.title}`,
    html: `
      <h1>${variables.title}</h1>
      <p>Un nouvel article vient de paraitre sur le blog.</p>
      <p><a href="${variables.post_url}" style="display:inline-block;padding:12px 24px;background-color:#2F5D50;color:#fff;text-decoration:none;border-radius:6px;">Lire l'article</a></p>
      <p style="margin-top:32px;font-size:12px;color:#888;">
        <a href="${variables.unsubscribe_url}">Ne plus recevoir les articles du blog</a>.
      </p>
    `,
  });
};

export const sendModuleReminder = async (
  clientEmail: string,
  variables: {
    title: string;
    remaining: number;
    accompagnement_url: string;
    unsubscribe_url: string;
  },
) => {
  await sendTransactionalEmail({
    to: clientEmail,
    subject: `Vous avez laissé « ${variables.title} » en cours`,
    html: `
      <h1>Reprenez quand vous voulez</h1>
      <p>Il vous reste ${variables.remaining} étape${variables.remaining > 1 ? "s" : ""} dans « ${variables.title} ».</p>
      <p><a href="${variables.accompagnement_url}" style="display:inline-block;padding:12px 24px;background-color:#2F5D50;color:#fff;text-decoration:none;border-radius:6px;">Reprendre</a></p>
      <p style="margin-top:32px;font-size:12px;color:#888;">
        <a href="${variables.unsubscribe_url}">Ne plus recevoir ces rappels</a>.
      </p>
    `,
  });
};

export const sendReviewRequest = async (
  clientEmail: string,
  variables: {
    client_name: string;
    review_url: string;
    unsubscribe_url: string;
  },
) => {
  await sendTransactionalEmail({
    to: clientEmail,
    subject: "Votre consultation, en quelques mots ?",
    html: `
      <p>Bonjour ${variables.client_name},</p>
      <p>J'espère que notre échange vous a été utile. Si vous avez un instant,
      votre retour aide beaucoup les futures mamans à se décider.</p>
      <p><a href="${variables.review_url}" style="display:inline-block;padding:12px 24px;background-color:#2F5D50;color:#fff;text-decoration:none;border-radius:6px;">Laisser un avis</a></p>
      <p style="margin-top:32px;font-size:12px;color:#888;">
        <a href="${variables.unsubscribe_url}">Ne plus recevoir ces demandes</a>.
      </p>
    `,
  });
};

export const sendWeeklyDigest = async (
  clientEmail: string,
  variables: { count: number; highlights: string[]; unsubscribe_url: string },
) => {
  await sendTransactionalEmail({
    to: clientEmail,
    subject: `Votre semaine : ${variables.count} nouveauté${variables.count > 1 ? "s" : ""}`,
    html: `
      <h1>Votre résumé de la semaine</h1>
      <ul>${variables.highlights.map((h) => `<li>${h}</li>`).join("")}</ul>
      <p style="margin-top:32px;font-size:12px;color:#888;">
        <a href="${variables.unsubscribe_url}">Ne plus recevoir ce résumé</a>.
      </p>
    `,
  });
};

/**
 * Message libre, ecrit dans le backoffice ou dans une automatisation.
 *
 * Le corps arrive en texte simple et non en HTML : il est saisi dans un
 * `textarea`, et l'injecter tel quel ouvrirait une porte a du balisage
 * arbitraire dans un email envoye en notre nom.
 */
export const sendFreeformMessage = async (
  clientEmail: string,
  variables: {
    title: string;
    body: string;
    href?: string;
    unsubscribe_url: string;
  },
) => {
  const escape = (value: string) =>
    value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const paragraphs = escape(variables.body)
    .split(/\n{2,}/)
    .map((block) => `<p>${block.replace(/\n/g, "<br />")}</p>`)
    .join("");

  const button = variables.href
    ? `<p><a href="${variables.href}" style="display:inline-block;padding:12px 24px;background-color:#2F5D50;color:#fff;text-decoration:none;border-radius:6px;">En savoir plus</a></p>`
    : "";

  await sendTransactionalEmail({
    to: clientEmail,
    subject: variables.title,
    html: `
      <h1>${escape(variables.title)}</h1>
      ${paragraphs}
      ${button}
      <p style="margin-top:32px;font-size:12px;color:#888;">
        <a href="${variables.unsubscribe_url}">Ne plus recevoir ces messages</a>.
      </p>
    `,
  });
};

/**
 * Annonce hebdomadaire, envoyee le lundi aux abonnees de la newsletter
 * publique (`newsletter_subscribers`), pour le ou les articles publies dans
 * les 7 jours precedents.
 *
 * Distincte de `sendBlogPostToClients` : celle-ci part immediatement a chaque
 * publication, vers les clientes ayant un compte. Celle-ci part une fois par
 * semaine, vers une liste d'abonnees externe au compte client.
 */
const escapeHtmlText = (value: string): string =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * Une carte par article publie dans la semaine. Construit en code, pas dans le
 * template edite en admin : le nombre d'articles varie d'une semaine a
 * l'autre, ce qu'un simple remplacement de `{{variable}}` ne peut pas
 * exprimer — comme `buildZoomBlock` ou `buildMemoBlock` pour les autres
 * templates.
 */
export const buildNewsletterPostsBlock = (
  posts: { title: string; excerpt: string | null; url: string; thumbnail_url: string | null }[],
): string => {
  const serif = "Georgia, 'Times New Roman', serif";

  const cards = posts
    .map((post, index) => {
      const thumbnail = post.thumbnail_url
        ? `<img src="${post.thumbnail_url}" alt="" width="552" style="display:block;width:100%;max-width:552px;height:auto;border-radius:8px;margin:0 0 16px 0;" />`
        : "";
      const excerpt = post.excerpt
        ? `<p style="margin:0 0 16px 0;color:#5a6b69;">${escapeHtmlText(post.excerpt)}</p>`
        : "";
      const divider =
        index > 0
          ? `<tr><td style="padding:32px 0 0 0;border-top:1px solid #e8ddd9;"></td></tr>`
          : "";

      return `
        ${divider}
        <tr><td style="padding:${index > 0 ? "24px" : "0"} 0 0 0;">
          ${thumbnail}
          <h2 style="margin:0 0 12px 0;font-family:${serif};font-size:22px;line-height:28px;color:#203634;">
            <a href="${post.url}" style="color:#203634;text-decoration:none;">${escapeHtmlText(post.title)}</a>
          </h2>
          ${excerpt}
          <a href="${post.url}" style="color:#a0283e;font-weight:600;text-decoration:none;">Lire l'article &rarr;</a>
        </td></tr>
      `;
    })
    .join("");

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">${cards}</table>`;
};

export const sendNewsletterBlogDigest = async (
  subscriberEmail: string,
  variables: {
    first_name: string;
    posts: { title: string; excerpt: string | null; url: string; thumbnail_url: string | null }[];
    unsubscribe_url: string;
  },
) => {
  const { posts } = variables;
  const postsBlock = buildNewsletterPostsBlock(posts);
  const unsubscribeLink = buildUnsubscribeLink(variables.unsubscribe_url);

  const template = await getTemplate("newsletter_blog_digest");
  if (template) {
    const { subject, html } = await renderTemplateRow(template, {
      first_name: variables.first_name,
      posts_block: postsBlock,
      unsubscribe_link: unsubscribeLink,
    });
    await sendTransactionalEmail({ to: subscriberEmail, subject, html });
    return;
  }

  const serif = "Georgia, 'Times New Roman', serif";
  const subject =
    posts.length === 1
      ? `Nouvel article : ${posts[0].title}`
      : `${posts.length} nouveaux articles cette semaine sur le blog`;

  await sendTransactionalEmail({
    to: subscriberEmail,
    subject,
    html: `
      <p style="margin:0 0 4px 0;font-size:12px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:#a0283e;">Cette semaine sur le blog</p>
      <h1 style="margin:0 0 16px 0;font-family:${serif};font-size:28px;line-height:34px;color:#203634;">Bonjour ${escapeHtmlText(variables.first_name)},</h1>
      <p style="margin:0 0 28px 0;color:#5a6b69;">Chaque lundi, le ou les nouveaux articles publiés sur le blog la semaine passée.</p>
      ${postsBlock}
      <p style="margin:32px 0 0 0;font-size:12px;color:#888;">${unsubscribeLink}</p>
    `,
  });
};

/** Recapitulatif interne. Pas de lien de desinscription : categorie systeme. */
export const sendAdminDigest = async (
  adminEmail: string,
  variables: { count: number; highlights: string[]; date: string },
) => {
  await sendTransactionalEmail({
    to: adminEmail,
    subject: `Récapitulatif du ${variables.date} : ${variables.count} événement${variables.count > 1 ? "s" : ""}`,
    html: `
      <h1>Récapitulatif du ${variables.date}</h1>
      <ul>${variables.highlights.map((h) => `<li>${h}</li>`).join("")}</ul>
    `,
  });
};
