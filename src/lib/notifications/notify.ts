import { createAdminClient } from "@/lib/supabase/admin";
import { NOTIFICATION_CATALOG } from "./catalog";
import { resolveChannels } from "./preferences";
import type {
  NotificationDataMap,
  NotificationEvent,
  NotificationRecipient,
} from "./types";

type NotifyOptions = {
  /**
   * Identifiant métier de ce qui est notifié (facture, réservation). Présent, il
   * rend l'insertion idempotente : un webhook rejoué ou un cron relancé ne crée
   * pas de doublon.
   */
  dedupeId?: string;
};

/**
 * Point d'entrée unique des notifications. Strictement serveur : l'insertion
 * chez autrui passe par le client admin Supabase, qui contourne RLS.
 *
 * Ne lève jamais. Chaque canal et chaque destinataire sont isolés : un échec
 * d'email ne doit pas faire échouer le webhook Stripe qui l'a déclenché.
 */
export const notify = async <K extends NotificationEvent>(
  event: K,
  recipients: NotificationRecipient[],
  data: NotificationDataMap[K],
  options: NotifyOptions = {}
): Promise<void> => {
  const def = NOTIFICATION_CATALOG[event];
  const channels = resolveChannels(def.category, def.channels);
  const supabase = createAdminClient();

  for (const recipient of recipients) {
    if (channels.includes("in_app")) {
      try {
        const dedupeKey = options.dedupeId
          ? `${event}:${recipient.userId}:${options.dedupeId}`
          : null;

        const { error } = await supabase.from("notifications").upsert(
          {
            user_id: recipient.userId,
            type: event,
            category: def.category,
            title: def.title(data),
            body: def.body?.(data) ?? null,
            href: def.href?.(data) ?? null,
            actions: def.actions?.(data) ?? null,
            metadata: data as Record<string, unknown>,
            dedupe_key: dedupeKey,
          },
          { onConflict: "dedupe_key", ignoreDuplicates: true }
        );

        if (error) {
          console.error(
            `notify: insertion in-app échouée pour ${recipient.userId} (${event}):`,
            error
          );
        }
      } catch (error) {
        console.error(`notify: insertion in-app levée (${event}):`, error);
      }
    }

    if (channels.includes("email") && def.email && recipient.email) {
      try {
        await def.email(recipient.email, data);
      } catch (error) {
        console.error(
          `notify: email échoué pour ${recipient.email} (${event}):`,
          error
        );
      }
    }
  }
};
