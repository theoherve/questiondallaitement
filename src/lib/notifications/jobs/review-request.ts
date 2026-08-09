import { addDays, endOfDay, startOfDay } from "date-fns";
import { createAdminClient } from "@/lib/supabase/admin";
import { notify } from "@/lib/notifications/notify";
import { GOOGLE_PROFILE } from "@/data/testimonials";

/** Délai après la consultation. Assez tard pour avoir un avis, assez tôt pour s'en souvenir. */
const DAYS_AFTER = 2;

/**
 * URL d'écriture d'avis, dérivée de la fiche existante. La constante partagée
 * pointe vers la **lecture** des avis ; la variante d'écriture ouvre
 * directement le formulaire, ce qui évite une étape à la cliente.
 */
const REVIEW_URL = GOOGLE_PROFILE.url.replace(
  "local/reviews",
  "local/writereview",
);

/**
 * Demande un avis deux jours après la consultation.
 *
 * `bookings` n'a pas de `completed_at` : la fenêtre porte donc sur `ends_at`,
 * la date du rendez-vous. C'est de toute façon ce dont parle le message.
 *
 * Déduplication définitive par réservation : on ne demande un avis qu'une fois.
 */
export const runReviewRequests = async (): Promise<number> => {
  const supabase = createAdminClient();
  const target = addDays(new Date(), -DAYS_AFTER);

  const { data: bookings } = await supabase
    .from("bookings")
    .select(
      "id, client_id, profiles!bookings_client_id_fkey(first_name, email, notification_unsubscribe_token)",
    )
    .eq("status", "completed")
    .gte("ends_at", startOfDay(target).toISOString())
    .lte("ends_at", endOfDay(target).toISOString());

  let sent = 0;

  for (const booking of bookings ?? []) {
    const profile = booking.profiles as unknown as {
      first_name: string | null;
      email: string | null;
      notification_unsubscribe_token: string | null;
    } | null;

    if (!profile?.email) continue;

    await notify(
      "review_request",
      [
        {
          userId: booking.client_id,
          email: profile.email,
          unsubscribeToken: profile.notification_unsubscribe_token,
        },
      ],
      {
        booking_id: booking.id,
        client_name: profile.first_name ?? "",
        review_url: REVIEW_URL,
      },
      { dedupeId: booking.id },
    );
    sent++;
  }

  return sent;
};
