import { createAdminClient } from "@/lib/supabase/admin";
import { notify } from "@/lib/notifications/notify";

/** Silence minimal avant de considérer qu'un accompagnement est en plan. */
const IDLE_DAYS = 7;

/**
 * Relance les accompagnements commencés puis laissés de côté.
 *
 * Déduplication par inscription et par mois calendaire : relancer chaque
 * semaine quelqu'un qui a arrêté serait du harcèlement, une fois par mois est
 * une relance. La clé absorbe aussi bien un cron horaire qu'un cron quotidien,
 * sans qu'on ait besoin de connaître sa fréquence, qui vit hors du dépôt.
 */
export const runModuleReminders = async (): Promise<number> => {
  const supabase = createAdminClient();

  // Les blocs pendent des sections, pas de l'accompagnement : d'ou
  // l'imbrication, reprise de `src/app/(public)/espace-client/page.tsx`.
  const { data: enrollments } = await supabase
    .from("accompagnement_enrollments")
    .select(
      "id, client_id, accompagnement_id, accompagnements(id, title, accompagnement_sections(accompagnement_blocks(id))), profiles!accompagnement_enrollments_client_id_fkey(email, notification_unsubscribe_token)",
    );

  if (!enrollments || enrollments.length === 0) return 0;

  const { data: progress } = await supabase
    .from("accompagnement_progress")
    .select("enrollment_id, block_id, completed, completed_at");

  const month = new Date().toISOString().slice(0, 7);
  const idleBefore = Date.now() - IDLE_DAYS * 86400000;
  let sent = 0;

  for (const enrollment of enrollments) {
    const accompagnement = enrollment.accompagnements as unknown as {
      id: string;
      title: string;
      accompagnement_sections: { accompagnement_blocks: { id: string }[] }[];
    } | null;
    const profile = enrollment.profiles as unknown as {
      email: string | null;
      notification_unsubscribe_token: string | null;
    } | null;

    // Donnees incompletes : on passe, sans faire echouer le reste du balayage.
    if (!accompagnement || !profile?.email) continue;

    const done = (progress ?? []).filter(
      (p) => p.enrollment_id === enrollment.id && p.completed,
    );

    // Jamais commence : ce n'est pas une relance qu'il faut, c'est un premier
    // pas, et l'email d'acces l'a deja propose.
    if (done.length === 0) continue;

    const totalBlocks = (accompagnement.accompagnement_sections ?? []).reduce(
      (acc, section) => acc + (section.accompagnement_blocks?.length ?? 0),
      0,
    );
    const remaining = totalBlocks - done.length;
    if (remaining <= 0) continue;

    const lastAt = Math.max(
      ...done.map((p) => new Date(p.completed_at as string).getTime()),
    );
    if (lastAt > idleBefore) continue;

    await notify(
      "module_reminder",
      [
        {
          userId: enrollment.client_id,
          email: profile.email,
          unsubscribeToken: profile.notification_unsubscribe_token,
        },
      ],
      {
        accompagnement_id: accompagnement.id,
        title: accompagnement.title,
        remaining,
      },
      { dedupeId: `${enrollment.id}:${month}` },
    );
    sent++;
  }

  return sent;
};
