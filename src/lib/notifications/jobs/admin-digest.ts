import { subDays } from "date-fns";
import { createAdminClient } from "@/lib/supabase/admin";
import { notify } from "@/lib/notifications/notify";
import { getRoleRecipients } from "@/lib/notifications/recipients";

/** Nombre de titres repris. Plus large que le résumé client : c'est un outil de travail. */
const MAX_HIGHLIGHTS = 10;

/**
 * Récapitulatif quotidien des alertes internes des vingt-quatre dernières
 * heures.
 *
 * Le cron tourne toutes les heures : la clé de déduplication par jour fait que
 * seul le premier passage de la journée envoie quelque chose.
 */
export const runAdminDigest = async (
  now: Date = new Date(),
): Promise<number> => {
  const recipients = await getRoleRecipients("admin");
  if (recipients.length === 0) return 0;

  const { data: rows } = await createAdminClient()
    .from("notifications")
    .select("title, category")
    .eq("category", "system")
    .gte("created_at", subDays(now, 1).toISOString())
    .order("created_at", { ascending: false });

  const titles = (rows ?? []).map((r) => r.title as string);

  // Journee vide : ne pas ecrire pour dire qu'il ne s'est rien passe.
  if (titles.length === 0) return 0;

  await notify(
    "admin_digest",
    recipients,
    { count: titles.length, highlights: titles.slice(0, MAX_HIGHLIGHTS) },
    { dedupeId: now.toISOString().slice(0, 10) },
  );

  return 1;
};
