import type { NotificationAction, NotificationCategory } from "@/types/database";
import type { NotificationPreferenceKey } from "./preference-categories";

export type NotificationChannel = "in_app" | "email";

/**
 * Données attendues par chaque événement. Le typage part d'ici : ajouter une
 * entrée force à compléter le catalogue, et `notify()` refuse une clé inconnue
 * dès la compilation.
 */
export type NotificationDataMap = {
  booking_confirmed: {
    booking_id: string;
    consultation_title?: string;
    client_name?: string;
    consultant_name?: string;
    date?: string;
    time?: string;
    zoom_join_url?: string;
  };
  booking_reminder: {
    booking_id: string;
    time: string;
    client_name: string;
    consultant_name: string;
  };
  booking_cancelled: {
    booking_id: string;
    date: string;
    client_name?: string;
    refund_info?: string;
  };
  booking_rescheduled: { booking_id: string; date: string; time: string };
  payment_received: { amount: string; label: string };
  invoice_available: { invoice_id: string; number: string; amount: string };
  accompagnement_access: {
    accompagnement_id: string;
    title: string;
    client_name: string;
  };
  formation_registered: { formation_id: string; title: string; date: string };
  formation_reminder: { formation_id: string; title: string; time: string };
  consultant_new_booking: {
    booking_id: string;
    client_name: string;
    consultant_name: string;
    date: string;
    time: string;
    zoom_host_url?: string;
  };
  consultant_booking_cancelled: {
    booking_id: string;
    client_name: string;
    consultant_name: string;
    date: string;
    reason: string;
  };
  admin_purchase: { label: string; amount: string; client_name: string };
  admin_refund: { label: string; amount: string; client_name: string };
  admin_payment_failed: { label: string; client_name: string; reason: string };
  admin_new_review: { author: string; rating: number };
  admin_job_failed: { job: string; reason: string };
  admin_message: { source?: string };
  consultant_message: { source?: string };
};

export type NotificationEvent = keyof NotificationDataMap;

export type NotificationRecipient = { userId: string; email?: string | null };

export type NotificationDefinition<K extends NotificationEvent> = {
  key: K;
  category: NotificationCategory;
  /** Catégorie visible par l'utilisatrice, qui porte ses préférences. */
  preferenceKey: NotificationPreferenceKey;
  channels: NotificationChannel[];
  title: (data: NotificationDataMap[K]) => string;
  body?: (data: NotificationDataMap[K]) => string;
  href?: (data: NotificationDataMap[K]) => string;
  actions?: (data: NotificationDataMap[K]) => NotificationAction[];
  /**
   * Adaptateur email. Reçoit l'adresse du destinataire, car les fonctions de
   * `src/lib/emails/send.ts` ont chacune leur propre signature de variables.
   * Absent quand l'événement n'existe qu'en in-app.
   */
  email?: (to: string, data: NotificationDataMap[K]) => Promise<void>;
};

export type NotificationCatalog = {
  [K in NotificationEvent]: NotificationDefinition<K>;
};

export type { NotificationAction, NotificationCategory };
