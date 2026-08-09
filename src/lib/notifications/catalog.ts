import type { NotificationCatalog } from "./types";

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
    channels: ["in_app", "email"],
    title: () => "Consultation confirmée",
    body: (d) =>
      d.consultation_title
        ? `Votre consultation "${d.consultation_title}" a été confirmée.`
        : "Votre consultation a été confirmée.",
    href: (d) => `/espace-client/reservations/${d.booking_id}`,
  },
  booking_reminder: {
    key: "booking_reminder",
    category: "transactional",
    channels: ["in_app", "email"],
    title: (d) => `Rappel : consultation demain à ${d.time}`,
    href: (d) => `/espace-client/reservations/${d.booking_id}`,
    actions: (d) => [
      {
        label: "Voir le rendez-vous",
        href: `/espace-client/reservations/${d.booking_id}`,
        variant: "primary",
      },
    ],
  },
  booking_cancelled: {
    key: "booking_cancelled",
    category: "transactional",
    channels: ["in_app", "email"],
    title: () => "Consultation annulée",
    body: (d) => `Votre consultation du ${d.date} a été annulée.`,
    href: () => "/espace-client/reservations",
  },
  booking_rescheduled: {
    key: "booking_rescheduled",
    category: "transactional",
    channels: ["in_app", "email"],
    title: () => "Consultation reprogrammée",
    body: (d) => `Nouvelle date : ${d.date} à ${d.time}.`,
    href: (d) => `/espace-client/reservations/${d.booking_id}`,
  },
  payment_received: {
    key: "payment_received",
    category: "transactional",
    channels: ["in_app"],
    title: () => "Paiement reçu",
    body: (d) => `${d.label}, ${d.amount}.`,
    href: () => "/espace-client/factures",
  },
  invoice_available: {
    key: "invoice_available",
    category: "transactional",
    channels: ["in_app", "email"],
    title: () => "Votre facture est disponible",
    body: (d) => `Facture ${d.number}, ${d.amount}.`,
    href: () => "/espace-client/factures",
    actions: (d) => [
      {
        label: "Télécharger",
        href: `/api/invoices/${d.invoice_id}/pdf`,
        variant: "primary",
      },
    ],
  },
  accompagnement_access: {
    key: "accompagnement_access",
    category: "transactional",
    channels: ["in_app", "email"],
    title: () => "Votre accompagnement est ouvert",
    body: (d) => d.title,
    href: (d) => `/espace-client/accompagnements/${d.accompagnement_slug}`,
    actions: (d) => [
      {
        label: "Commencer",
        href: `/espace-client/accompagnements/${d.accompagnement_slug}`,
        variant: "primary",
      },
    ],
  },
  formation_registered: {
    key: "formation_registered",
    category: "transactional",
    channels: ["in_app", "email"],
    title: () => "Inscription confirmée",
    body: (d) => `${d.title}, le ${d.date}.`,
    href: (d) => `/espace-client/formations/${d.formation_id}`,
  },
  formation_reminder: {
    key: "formation_reminder",
    category: "transactional",
    channels: ["in_app", "email"],
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
    channels: ["in_app", "email"],
    title: () => "Nouvelle réservation",
    body: (d) => `${d.client_name}, le ${d.date}.`,
    href: (d) => `/espace-consultante/reservations?booking=${d.booking_id}`,
  },
  consultant_booking_cancelled: {
    key: "consultant_booking_cancelled",
    category: "transactional",
    channels: ["in_app", "email"],
    title: () => "Réservation annulée",
    body: (d) => `${d.client_name}, le ${d.date}.`,
    href: () => "/espace-consultante/reservations",
  },
  admin_purchase: {
    key: "admin_purchase",
    category: "system",
    channels: ["in_app"],
    title: () => "Nouvel achat",
    body: (d) => `${d.label}, ${d.amount}, par ${d.client_name}.`,
    href: () => "/admin/paiements",
  },
  admin_refund: {
    key: "admin_refund",
    category: "system",
    channels: ["in_app"],
    title: () => "Remboursement effectué",
    body: (d) => `${d.label}, ${d.amount}, pour ${d.client_name}.`,
    href: () => "/admin/paiements",
  },
  admin_payment_failed: {
    key: "admin_payment_failed",
    category: "system",
    channels: ["in_app", "email"],
    title: () => "Échec de paiement",
    body: (d) => `${d.label}, ${d.client_name}. Motif : ${d.reason}.`,
    href: () => "/admin/paiements",
  },
  admin_new_review: {
    key: "admin_new_review",
    category: "system",
    channels: ["in_app"],
    title: () => "Nouvel avis client",
    body: (d) => `${d.author}, ${d.rating} sur 5.`,
    href: () => "/admin/avis",
  },
  admin_job_failed: {
    key: "admin_job_failed",
    category: "system",
    channels: ["in_app", "email"],
    title: (d) => `Échec : ${d.job}`,
    body: (d) => d.reason,
    href: () => "/admin",
  },
  admin_message: {
    key: "admin_message",
    category: "system",
    channels: ["in_app"],
    title: () => "Message de l'équipe",
  },
  consultant_message: {
    key: "consultant_message",
    category: "transactional",
    channels: ["in_app"],
    title: () => "Message de votre consultante",
  },
};
