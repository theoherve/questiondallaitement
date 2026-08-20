import { subDays } from "date-fns";
import { createAdminClient } from "@/lib/supabase/admin";
import { notify } from "@/lib/notifications/notify";
import { resolveAudience } from "@/lib/notifications/audience";
import { isoWeek } from "@/lib/date/iso-week";

/** Nombre de titres repris dans le corps. Au-delà, ce n'est plus un résumé. */
const MAX_HIGHLIGHTS = 5;

/**
 * Résumé hebdomadaire des notifications non lues de la semaine écoulée.
 *
 * Ne s'exécute que le lundi : la fréquence du cron n'est pas lisible depuis le
 * dépôt, elle est réglée dans le tableau de bord Vercel. Le travail vérifie
 * donc lui-même sa fenêtre, et la clé par semaine ISO absorbe plusieurs
 * passages le même lundi.
 *
 * `now` est injectable pour les tests : sans cela, il faudrait attendre un
 * lundi pour vérifier quoi que ce soit.
 */
export const runWeeklyDigest = async (
  now: Date = new Date(),
): Promise<number> => {
  if (now.getDay() !== 1) return 0;

  const recipients = await resolveAudience("weekly_digest", {
    kind: "preference_enabled",
    categoryKey: "digest",
  });

  if (recipients.length === 0) return 0;

  const supabase = createAdminClient();
  const since = subDays(now, 7).toISOString();
  const week = isoWeek(now);
  let sent = 0;

  for (const recipient of recipients) {
    const { data: rows } = await supabase
      .from("notifications")
      .select("title")
      .eq("user_id", recipient.userId)
      .is("read_at", null)
      .gte("created_at", since)
      .order("created_at", { ascending: false });

    const titles = (rows ?? []).map((r) => r.title as string);

    // Semaine vide : ne pas ecrire pour dire qu'il n'y a rien a dire.
    if (titles.length === 0) continue;

    await notify(
      "weekly_digest",
      [recipient],
      {
        count: titles.length,
        highlights: titles.slice(0, MAX_HIGHLIGHTS),
      },
      { dedupeId: `${recipient.userId}:${week}` },
    );
    sent++;
  }

  return sent;
};
