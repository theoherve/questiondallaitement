import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";
import { vapidConfig } from "./keys";

/**
 * Longueurs maximales de la charge utile. Le protocole plafonne la taille du
 * message chiffré ; au-delà, l'envoi est refusé pour tous les abonnements d'un
 * coup. Tronquer vaut mieux que ne rien recevoir.
 */
const MAX_TITLE = 80;
const MAX_BODY = 160;

/** Une heure de conservation : au-delà, un rappel n'a plus d'intérêt. */
const TTL_SECONDS = 3600;

export type PushPayload = {
  title: string;
  body?: string | null;
  href?: string | null;
  /** Regroupe les notifications : une même clé remplace la précédente. */
  tag?: string | null;
};

/**
 * Envoie à tous les navigateurs abonnés d'une utilisatrice. Renvoie le nombre
 * d'envois acceptés.
 *
 * Ne lève jamais. Chaque abonnement est isolé : un ancien téléphone en échec ne
 * doit pas empêcher l'ordinateur de sonner.
 */
export const sendPushToUser = async (
  userId: string,
  payload: PushPayload,
): Promise<number> => {
  const config = vapidConfig();
  if (!config) {
    console.warn("push: clés VAPID absentes, canal désactivé");
    return 0;
  }

  const supabase = createAdminClient();
  const { data: subscriptions, error } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", userId);

  if (error) {
    console.error(`push: lecture des abonnements échouée (${userId}) :`, error);
    return 0;
  }
  if (!subscriptions || subscriptions.length === 0) return 0;

  webpush.setVapidDetails(config.subject, config.publicKey, config.privateKey);

  const body = JSON.stringify({
    title: payload.title.slice(0, MAX_TITLE),
    body: payload.body ? payload.body.slice(0, MAX_BODY) : undefined,
    href: payload.href ?? "/",
    tag: payload.tag ?? undefined,
  });

  let sent = 0;

  for (const subscription of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint as string,
          keys: {
            p256dh: subscription.p256dh as string,
            auth: subscription.auth as string,
          },
        },
        body,
        { TTL: TTL_SECONDS },
      );
      sent += 1;

      await supabase
        .from("push_subscriptions")
        .update({ last_success_at: new Date().toISOString(), failure_count: 0 })
        .eq("endpoint", subscription.endpoint as string);
    } catch (sendError) {
      const status = (sendError as { statusCode?: number }).statusCode;

      // 404 et 410 : c'est ainsi que le protocole signale un abonnement mort
      // (navigateur reinstalle, cache vide, autorisation retiree). Le garder
      // ferait grossir la table de dechets qui echoueront a chaque envoi.
      if (status === 404 || status === 410) {
        await supabase
          .from("push_subscriptions")
          .delete()
          .eq("endpoint", subscription.endpoint as string);
        continue;
      }

      console.error(
        `push: envoi échoué (${status ?? "sans statut"}) pour ${userId} :`,
        sendError,
      );
    }
  }

  return sent;
};
