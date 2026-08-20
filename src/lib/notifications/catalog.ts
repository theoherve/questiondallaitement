import {
  sendAccompagnementAccess,
  sendAdminDigest,
  sendBookingCancelled,
  sendBookingCancelledToConsultant,
  sendBookingConfirmation,
  sendBookingConfirmedToConsultant,
  sendBlogPostToClients,
  sendFreeformMessage,
  sendModuleReminder,
  sendReplayPublished,
  sendReviewRequest,
  sendWeeklyDigest,
} from "@/lib/emails/send";
import type { NotificationCatalog } from "./types";

const siteUrl = () => process.env.NEXT_PUBLIC_SITE_URL ?? "";

/**
 * Source de vérité des événements de notification. Une entrée par événement.
 *
 * `title`, `body`, `href` et `actions` sont évalués **à l'insertion** puis figés
 * en base : une notification ancienne doit garder son libellé et sa cible même
 * si la définition change ensuite.
 *
 * Les adaptateurs `email` sont ajoutés au moment où l'envoi direct est retiré de
 * son point d'appel, jamais avant : sinon l'email partirait deux fois.
 */
export const NOTIFICATION_CATALOG: NotificationCatalog = {
  booking_confirmed: {
    key: "booking_confirmed",
    category: "transactional",
    preferenceKey: "rendez_vous",
    channels: ["in_app", "email"],
    title: () => "Consultation confirmée",
    body: (d) =>
      d.consultation_title
        ? `Votre consultation "${d.consultation_title}" a été confirmée.`
        : "Votre consultation a été confirmée.",
    // Il n'existe pas de route par réservation : la liste est la seule cible.
    href: () => "/espace-client/reservations",
    email: async (to, d) => {
      // Les variables du template ne sont completes que sur le chemin checkout.
      // Ailleurs (confirmation manuelle par la consultante), l'email est deja
      // parti autrement : on ne renvoie rien plutot qu'un template a trous.
      if (!d.date || !d.time) return;
      await sendBookingConfirmation(to, {
        client_name: d.client_name ?? "",
        consultant_name: d.consultant_name ?? "",
        date: d.date,
        time: d.time,
        zoom_join_url: d.zoom_join_url,
      });
    },
  },
  booking_reminder: {
    key: "booking_reminder",
    category: "transactional",
    preferenceKey: "rendez_vous",
    channels: ["in_app", "email", "push"],
    title: (d) => `Rappel : consultation demain à ${d.time}`,
    href: () => "/espace-client/reservations",
  },
  booking_cancelled: {
    key: "booking_cancelled",
    category: "transactional",
    preferenceKey: "rendez_vous",
    channels: ["in_app", "email", "push"],
    title: () => "Consultation annulée",
    body: (d) =>
      d.refund_info
        ? `Votre consultation du ${d.date} a été annulée. ${d.refund_info}`
        : `Votre consultation du ${d.date} a été annulée.`,
    href: () => "/espace-client/reservations",
    email: (to, d) =>
      sendBookingCancelled(to, {
        client_name: d.client_name ?? "",
        date: d.date,
        refund_info: d.refund_info ?? "Aucun remboursement.",
      }),
  },
  booking_rescheduled: {
    key: "booking_rescheduled",
    category: "transactional",
    preferenceKey: "rendez_vous",
    channels: ["in_app", "email", "push"],
    title: () => "Consultation reprogrammée",
    body: (d) => `Nouvelle date : ${d.date} à ${d.time}.`,
    href: () => "/espace-client/reservations",
  },
  payment_received: {
    key: "payment_received",
    category: "transactional",
    preferenceKey: "paiements",
    channels: ["in_app"],
    title: () => "Paiement reçu",
    body: (d) => `${d.label}, ${d.amount}.`,
    href: () => "/espace-client/factures",
  },
  invoice_available: {
    key: "invoice_available",
    category: "transactional",
    preferenceKey: "paiements",
    // In-app seulement : l'email de facture part de `src/lib/invoicing`, avec
    // le PDF en piece jointe. Le rapatrier ici n'apporterait rien.
    channels: ["in_app"],
    title: () => "Votre facture est disponible",
    body: (d) => `Facture ${d.number}, ${d.amount}.`,
    href: () => "/espace-client/factures",
    actions: (d) => [
      {
        label: "Voir la facture",
        href: `/factures/${d.invoice_id}`,
        variant: "primary",
      },
    ],
  },
  accompagnement_access: {
    key: "accompagnement_access",
    category: "transactional",
    preferenceKey: "acces_contenus",
    channels: ["in_app", "email", "push"],
    title: () => "Votre accompagnement est ouvert",
    body: (d) => d.title,
    href: (d) => `/espace-client/accompagnements/${d.accompagnement_id}`,
    actions: (d) => [
      {
        label: "Commencer",
        href: `/espace-client/accompagnements/${d.accompagnement_id}`,
        variant: "primary",
      },
    ],
    email: (to, d) =>
      sendAccompagnementAccess(to, {
        client_name: d.client_name,
        accompagnement_title: d.title,
        access_url: `${siteUrl()}/espace-client/accompagnements/${d.accompagnement_id}`,
      }),
  },
  formation_registered: {
    key: "formation_registered",
    category: "transactional",
    preferenceKey: "acces_contenus",
    channels: ["in_app", "email"],
    title: () => "Inscription confirmée",
    body: (d) => `${d.title}, le ${d.date}.`,
    href: (d) => `/espace-client/formations/${d.formation_id}`,
  },
  formation_reminder: {
    key: "formation_reminder",
    category: "transactional",
    preferenceKey: "acces_contenus",
    channels: ["in_app", "email", "push"],
    title: (d) => `Rappel : ${d.title} demain à ${d.time}`,
    href: (d) => `/espace-client/formations/${d.formation_id}`,
    actions: (d) => [
      {
        label: "Voir la session",
        href: `/espace-client/formations/${d.formation_id}`,
        variant: "primary",
      },
    ],
  },
  consultant_new_booking: {
    key: "consultant_new_booking",
    category: "transactional",
    preferenceKey: "rendez_vous",
    channels: ["in_app", "email", "push"],
    title: () => "Nouvelle réservation",
    body: (d) => `${d.client_name}, le ${d.date}.`,
    href: () => "/espace-consultante/reservations",
    email: (to, d) =>
      sendBookingConfirmedToConsultant(to, {
        consultant_name: d.consultant_name,
        client_name: d.client_name,
        date: d.date,
        time: d.time,
        zoom_host_url: d.zoom_host_url,
      }),
  },
  consultant_booking_cancelled: {
    key: "consultant_booking_cancelled",
    category: "transactional",
    preferenceKey: "rendez_vous",
    channels: ["in_app", "email", "push"],
    title: () => "Réservation annulée",
    body: (d) => `${d.client_name}, le ${d.date}.`,
    href: () => "/espace-consultante/reservations",
    email: (to, d) =>
      sendBookingCancelledToConsultant(to, {
        consultant_name: d.consultant_name,
        client_name: d.client_name,
        date: d.date,
        reason: d.reason,
      }),
  },
  admin_purchase: {
    key: "admin_purchase",
    category: "system",
    preferenceKey: "systeme",
    channels: ["in_app"],
    title: () => "Nouvel achat",
    body: (d) => `${d.label}, ${d.amount}, par ${d.client_name}.`,
    href: () => "/admin/paiements",
  },
  admin_refund: {
    key: "admin_refund",
    category: "system",
    preferenceKey: "systeme",
    channels: ["in_app"],
    title: () => "Remboursement effectué",
    body: (d) => `${d.label}, ${d.amount}, pour ${d.client_name}.`,
    href: () => "/admin/paiements",
  },
  admin_payment_failed: {
    key: "admin_payment_failed",
    category: "system",
    preferenceKey: "systeme",
    channels: ["in_app", "email", "push"],
    title: () => "Échec de paiement",
    body: (d) => `${d.label}, ${d.client_name}. Motif : ${d.reason}.`,
    href: () => "/admin/paiements",
  },
  admin_new_review: {
    key: "admin_new_review",
    category: "system",
    preferenceKey: "systeme",
    channels: ["in_app"],
    title: () => "Nouvel avis client",
    body: (d) => `${d.author}, ${d.rating} sur 5.`,
    // Pas de route dediee aux avis dans le backoffice, et aucun emetteur
    // aujourd'hui : les avis sont des donnees statiques plus un import Google.
    href: () => "/admin",
  },
  admin_job_failed: {
    key: "admin_job_failed",
    category: "system",
    preferenceKey: "systeme",
    channels: ["in_app", "email", "push"],
    title: (d) => `Échec : ${d.job}`,
    body: (d) => d.reason,
    href: () => "/admin",
  },
  admin_message: {
    key: "admin_message",
    category: "system",
    preferenceKey: "systeme",
    channels: ["in_app"],
    title: () => "Message de l'équipe",
  },
  contact_message_received: {
    key: "contact_message_received",
    category: "system",
    preferenceKey: "systeme",
    channels: ["in_app"],
    title: (d) => `Nouveau message de contact : ${d.name}`,
    body: (d) => d.subject,
    href: (d) => `/admin/contact/${d.contactMessageId}`,
  },
  consultant_message: {
    key: "consultant_message",
    category: "transactional",
    preferenceKey: "rendez_vous",
    channels: ["in_app"],
    title: () => "Message de votre consultante",
  },
  replay_published: {
    key: "replay_published",
    category: "marketing",
    preferenceKey: "replays",
    channels: ["in_app", "email", "push"],
    title: () => "Nouveau replay disponible",
    body: (d) => d.title,
    href: () => "/replay-lives",
    actions: () => [
      { label: "Regarder", href: "/replay-lives", variant: "primary" },
    ],
    email: (to, d) =>
      sendReplayPublished(to, {
        title: d.title,
        replay_url: `${siteUrl()}/replay-lives`,
        unsubscribe_url: d.unsubscribe_url ?? `${siteUrl()}/espace-client/profil`,
      }),
  },
  blog_post_published: {
    key: "blog_post_published",
    category: "marketing",
    preferenceKey: "articles",
    channels: ["in_app", "email"],
    title: (d) => `Nouvel article : ${d.title}`,
    href: (d) => `/blog/${d.slug}`,
    actions: (d) => [
      { label: "Lire", href: `/blog/${d.slug}`, variant: "primary" },
    ],
    email: (to, d) =>
      sendBlogPostToClients(to, {
        title: d.title,
        post_url: `${siteUrl()}/blog/${d.slug}`,
        unsubscribe_url: d.unsubscribe_url ?? `${siteUrl()}/espace-client/profil`,
      }),
  },
  module_reminder: {
    key: "module_reminder",
    category: "marketing",
    preferenceKey: "rappels_suivi",
    channels: ["in_app", "email", "push"],
    title: (d) => `Vous avez laissé « ${d.title} » en cours`,
    body: (d) =>
      `Il vous reste ${d.remaining} étape${d.remaining > 1 ? "s" : ""}.`,
    href: (d) => `/espace-client/accompagnements/${d.accompagnement_id}`,
    actions: (d) => [
      {
        label: "Reprendre",
        href: `/espace-client/accompagnements/${d.accompagnement_id}`,
        variant: "primary",
      },
    ],
    email: (to, d) =>
      sendModuleReminder(to, {
        title: d.title,
        remaining: d.remaining,
        accompagnement_url: `${siteUrl()}/espace-client/accompagnements/${d.accompagnement_id}`,
        unsubscribe_url: d.unsubscribe_url ?? `${siteUrl()}/espace-client/profil`,
      }),
  },
  review_request: {
    key: "review_request",
    category: "marketing",
    preferenceKey: "rappels_suivi",
    channels: ["in_app", "email"],
    title: () => "Votre consultation, en quelques mots ?",
    body: () => "Votre retour aide les futures mamans à se décider.",
    // Seul lien sortant du catalogue : la fiche Google, ou l'avis se depose.
    href: (d) => d.review_url,
    actions: (d) => [
      { label: "Laisser un avis", href: d.review_url, variant: "primary" },
    ],
    email: (to, d) =>
      sendReviewRequest(to, {
        client_name: d.client_name,
        review_url: d.review_url,
        unsubscribe_url: d.unsubscribe_url ?? `${siteUrl()}/espace-client/profil`,
      }),
  },
  weekly_digest: {
    key: "weekly_digest",
    category: "marketing",
    preferenceKey: "digest",
    // Email seul : un resume in-app des notifications in-app ferait doublon
    // avec la liste qu'il resume.
    channels: ["email"],
    title: (d) => `Votre semaine : ${d.count} nouveauté${d.count > 1 ? "s" : ""}`,
    email: (to, d) =>
      sendWeeklyDigest(to, {
        count: d.count,
        highlights: d.highlights,
        unsubscribe_url: d.unsubscribe_url ?? `${siteUrl()}/espace-client/profil`,
      }),
  },
  automation_message: {
    key: "automation_message",
    category: "marketing",
    preferenceKey: "rappels_suivi",
    channels: ["in_app", "email"],
    title: (d) => d.title,
    body: (d) => d.body,
    href: (d) => d.href ?? "/espace-client",
    email: (to, d) =>
      sendFreeformMessage(to, {
        title: d.title,
        body: d.body,
        href: d.href ? `${siteUrl()}${d.href}` : undefined,
        unsubscribe_url: d.unsubscribe_url ?? `${siteUrl()}/espace-client/profil`,
      }),
  },
  broadcast_message: {
    key: "broadcast_message",
    category: "marketing",
    preferenceKey: "annonces",
    channels: ["in_app", "email", "push"],
    title: (d) => d.title,
    body: (d) => d.body,
    href: (d) => d.href ?? "/espace-client",
    email: (to, d) =>
      sendFreeformMessage(to, {
        title: d.title,
        body: d.body,
        href: d.href ? `${siteUrl()}${d.href}` : undefined,
        unsubscribe_url: d.unsubscribe_url ?? `${siteUrl()}/espace-client/profil`,
      }),
  },
  admin_digest: {
    key: "admin_digest",
    category: "system",
    preferenceKey: "systeme",
    // Email seul : l'administration voit deja chaque evenement dans sa cloche,
    // un recapitulatif in-app ferait doublon avec la liste qu'il resume.
    channels: ["email"],
    title: (d) => `Récapitulatif : ${d.count} événement${d.count > 1 ? "s" : ""}`,
    email: (to, d) =>
      sendAdminDigest(to, {
        count: d.count,
        highlights: d.highlights,
        date: new Date().toLocaleDateString("fr-FR", {
          day: "numeric",
          month: "long",
        }),
      }),
  },
  weight_alert_vigilance: {
    key: "weight_alert_vigilance",
    category: "system",
    preferenceKey: "systeme",
    channels: ["in_app"],
    title: () => "Vigilance — courbe de poids",
    body: (d) =>
      `${d.childName} — ${d.message} Aide à la décision — reste soumise à l'appréciation clinique de la praticienne IBCLC.`,
    href: (d) => `/espace-consultante/crm/${d.clientId}`,
  },
  weight_alert_alert: {
    key: "weight_alert_alert",
    category: "system",
    preferenceKey: "systeme",
    channels: ["in_app"],
    title: () => "Alerte — courbe de poids",
    body: (d) =>
      `${d.childName} — ${d.message} Aide à la décision — reste soumise à l'appréciation clinique de la praticienne IBCLC.`,
    href: (d) => `/espace-consultante/crm/${d.clientId}`,
  },
};
