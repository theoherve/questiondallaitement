import {
  sendAccompagnementAccess,
  sendBookingConfirmation,
  sendBookingConfirmedToConsultant,
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
    channels: ["in_app", "email"],
    title: (d) => `Rappel : consultation demain à ${d.time}`,
    href: () => "/espace-client/reservations",
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
    href: () => "/espace-client/reservations",
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
        label: "Voir la facture",
        href: `/factures/${d.invoice_id}`,
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
    // Pas de route dediee aux avis dans le backoffice, et aucun emetteur
    // aujourd'hui : les avis sont des donnees statiques plus un import Google.
    href: () => "/admin",
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
