import { createAdminClient } from "@/lib/supabase/admin";
import { loadClientStats, matchesConditions } from "@/lib/crm/segment-eval";
import { getRoleRecipients } from "./recipients";
import type { SegmentCondition } from "@/types/database";
import type { NotificationRecipient } from "./types";

export type AudienceRule =
  | { kind: "recipient"; userId: string; email?: string | null }
  | { kind: "role"; role: "admin" | "consultant" }
  | { kind: "segment"; segmentId: string }
  /** Toutes les clientes ayant souscrit au moins un accompagnement. */
  | { kind: "accompagnement_holders" }
  /**
   * Toutes les clientes ayant un compte. Le filtrage se fait ensuite par les
   * préférences : c'est l'audience d'un contenu ouvert, comme le blog.
   */
  | { kind: "all_clients" }
  /**
   * Les personnes ayant explicitement **activé** une catégorie. Utile pour une
   * catégorie en opt-in comme le digest, où l'absence de préférence vaut
   * refus : aucune autre règle ne sait exprimer cette audience.
   */
  | { kind: "preference_enabled"; categoryKey: string };

type ResolveOptions = {
  /**
   * Plafond de destinataires. Au-delà, la liste est coupée et la coupure est
   * journalisée plutôt que passée sous silence.
   */
  maxRecipients?: number;
};

const DEFAULT_MAX_RECIPIENTS = 2000;

/**
 * Traduit une règle d'audience en liste de destinataires.
 *
 * Tout ce qui dépasse le destinataire unique est journalisé dans
 * `notification_broadcasts` : une erreur de condition sur un segment large,
 * c'est un envoi à toute la base, et on préfère pouvoir le constater plutôt
 * que de le découvrir par les réponses.
 */
export const resolveAudience = async (
  event: string,
  rule: AudienceRule,
  options: ResolveOptions = {}
): Promise<NotificationRecipient[]> => {
  if (rule.kind === "recipient") {
    return [{ userId: rule.userId, email: rule.email }];
  }

  const max = options.maxRecipients ?? DEFAULT_MAX_RECIPIENTS;
  let resolved: NotificationRecipient[] = [];

  if (rule.kind === "role") {
    resolved = await getRoleRecipients(rule.role);
  } else if (rule.kind === "preference_enabled") {
    const client = createAdminClient();
    const { data: rows } = await client
      .from("notification_preferences")
      .select("user_id")
      .eq("category_key", rule.categoryKey)
      .eq("enabled", true);

    const userIds = [...new Set((rows ?? []).map((r) => r.user_id))];
    if (userIds.length === 0) {
      resolved = [];
    } else {
      const { data: profiles } = await client
        .from("profiles")
        .select("id, email, notification_unsubscribe_token")
        .in("id", userIds)
        .is("deleted_at", null);

      resolved = (profiles ?? []).map((p) => ({
        userId: p.id,
        email: p.email,
        unsubscribeToken: p.notification_unsubscribe_token,
      }));
    }
  } else if (rule.kind === "all_clients") {
    const stats = await loadClientStats();
    resolved = stats.map((c) => ({
      userId: c.id,
      email: c.email,
      unsubscribeToken: c.unsubscribe_token,
    }));
  } else if (rule.kind === "accompagnement_holders") {
    const stats = await loadClientStats();
    resolved = stats
      .filter((c) => c.has_accompagnement)
      .map((c) => ({
        userId: c.id,
        email: c.email,
        unsubscribeToken: c.unsubscribe_token,
      }));
  } else {
    const { data: segment } = await createAdminClient()
      .from("crm_segments")
      .select("conditions")
      .eq("id", rule.segmentId)
      .maybeSingle();

    // Segment introuvable : ne rien envoyer. Traiter l'absence de conditions
    // comme « aucune condition » toucherait toute la base.
    if (!segment) return [];

    const conditions = segment.conditions as SegmentCondition[];
    const stats = await loadClientStats();
    resolved = stats
      .filter((client) => matchesConditions(client, conditions))
      .map((c) => ({
        userId: c.id,
        email: c.email,
        unsubscribeToken: c.unsubscribe_token,
      }));
  }

  const truncated = resolved.length > max;
  const recipients = truncated ? resolved.slice(0, max) : resolved;

  try {
    await createAdminClient().from("notification_broadcasts").insert({
      event,
      rule,
      recipient_count: recipients.length,
      truncated,
    });
  } catch (error) {
    // Le journal ne doit pas empecher l'envoi.
    console.error(`resolveAudience: journalisation échouée (${event}) :`, error);
  }

  return recipients;
};
