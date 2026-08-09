import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendBlogPostPublishedNotification } from "@/lib/emails/send";
import { notify, getRoleRecipients, resolveAudience } from "@/lib/notifications";
import { format, addDays, startOfDay, endOfDay, subDays } from "date-fns";
import { fr } from "date-fns/locale";
import { revalidatePath } from "next/cache";
import { runAutomations } from "@/lib/automations/engine";
import { generateRecurringFormations } from "@/lib/admin-workflows/generate-formations";
import { scheduleWorkflowActionsForUpcomingFormations } from "@/lib/admin-workflows/scheduler";
import { executeScheduledActions } from "@/lib/admin-workflows/executor";
import {
  runModuleReminders,
  runReviewRequests,
  runWeeklyDigest,
} from "@/lib/notifications/jobs";

/**
 * Previent le backoffice qu'une etape du cron a echoue. Sans cela, l'echec
 * n'existe que dans les logs de la plateforme : personne ne le voit passer.
 *
 * Deduplique par jour et par etape, pour qu'un cron horaire en echec ne remplisse
 * pas la cloche.
 */
const notifyJobFailure = async (job: string, err: unknown) => {
  await notify(
    "admin_job_failed",
    await getRoleRecipients("admin"),
    { job, reason: err instanceof Error ? err.message : String(err) },
    { dedupeId: `${job}:${format(new Date(), "yyyy-MM-dd")}` },
  );
};

export const GET = async (request: Request) => {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const results: Record<string, unknown> = {};

  // ─── Publish Scheduled Blog Posts ─────────────────────────
  const now = new Date().toISOString();
  const { data: scheduledPosts } = await supabase
    .from("blog_posts")
    .select("id, slug, title")
    .eq("status", "scheduled")
    .lte("scheduled_at", now)
    .is("deleted_at", null);

  if (scheduledPosts && scheduledPosts.length > 0) {
    const ids = scheduledPosts.map((p) => p.id);
    const { error: publishError } = await supabase
      .from("blog_posts")
      .update({ status: "published", published_at: now })
      .in("id", ids);

    if (!publishError) {
      revalidatePath("/blog");
      for (const post of scheduledPosts) {
        revalidatePath(`/blog/${post.slug}`);
      }

      // Annonce aux clientes. Le dedupeId sur l'identifiant de l'article
      // garantit qu'un article republie ou corrige ne renotifie pas.
      const blogRecipients = await resolveAudience("blog_post_published", {
        kind: "all_clients",
      });

      for (const post of scheduledPosts) {
        await notify(
          "blog_post_published",
          blogRecipients,
          {
            post_id: post.id,
            slug: post.slug,
            title: (post as { title?: string }).title ?? "",
          },
          { dedupeId: post.id },
        );
      }

      // Notify admins
      const { data: admins } = await supabase
        .from("profiles")
        .select("email")
        .contains("roles", ["admin"])
        .not("email", "is", null);

      if (admins && admins.length > 0) {
        const { data: publishedDetails } = await supabase
          .from("blog_posts")
          .select("title")
          .in("id", ids);

        await sendBlogPostPublishedNotification(
          admins.map((a) => a.email!),
          {
            post_titles: publishedDetails?.map((p) => p.title) ?? [],
            post_count: scheduledPosts.length,
          },
        );
      }
    }
    results.blog_posts_published = publishError ? -1 : scheduledPosts.length;
  } else {
    results.blog_posts_published = 0;
  }

  // ─── Booking Reminders ────────────────────────────────────
  const tomorrow = addDays(new Date(), 1);
  const tomorrowStart = startOfDay(tomorrow).toISOString();
  const tomorrowEnd = endOfDay(tomorrow).toISOString();

  const { data: upcomingBookings } = await supabase
    .from("bookings")
    .select(
      `
      id,
      client_id,
      starts_at,
      status,
      profiles!bookings_client_id_fkey(email, first_name, last_name),
      consultants!inner(profiles!consultants_id_fkey(first_name, last_name))
    `,
    )
    .eq("status", "confirmed")
    .gte("starts_at", tomorrowStart)
    .lte("starts_at", tomorrowEnd);

  let remindersSent = 0;

  for (const booking of upcomingBookings ?? []) {
    const client = booking.profiles as unknown as {
      email: string;
      first_name: string | null;
      last_name: string | null;
    } | null;

    const consultantData = booking.consultants as unknown as {
      profiles: {
        first_name: string | null;
        last_name: string | null;
      } | null;
    } | null;

    if (client?.email) {
      try {
        await notify(
          "booking_reminder",
          [{ userId: booking.client_id, email: client.email }],
          {
            booking_id: booking.id,
            client_name:
              `${client.first_name ?? ""} ${client.last_name ?? ""}`.trim() ||
              "Client",
            consultant_name:
              `${consultantData?.profiles?.first_name ?? ""} ${consultantData?.profiles?.last_name ?? ""}`.trim() ||
              "Consultante",
            time: format(new Date(booking.starts_at), "HH'h'mm", {
              locale: fr,
            }),
          },
          // La date rend la cle unique par jour : un cron relance le meme jour
          // ne renotifie pas, une relance le lendemain le ferait.
          {
            dedupeId: `${booking.id}:${format(new Date(), "yyyy-MM-dd")}`,
          },
        );
        remindersSent++;
      } catch (err) {
        console.error(
          `Failed to send reminder for booking ${booking.id}:`,
          err,
        );
      }
    }
  }

  results.reminders_sent = remindersSent;

  // ─── Delay-after-formation automations ─────────────────────────
  const { data: delayAutomations } = await supabase
    .from("automations")
    .select("id, consultant_id, trigger_config")
    .eq("trigger_type", "delay_after_formation")
    .eq("is_active", true);

  let delayRuns = 0;
  for (const auto of delayAutomations ?? []) {
    const config = auto.trigger_config as { delay_days?: number; formation_ids?: string[] };
    const delayDays = config.delay_days ?? 1;
    const targetDate = subDays(new Date(), delayDays);
    const targetStart = startOfDay(targetDate).toISOString();
    const targetEnd = endOfDay(targetDate).toISOString();

    const { data: formations } = await supabase
      .from("formations")
      .select("id, title, starts_at")
      .eq("consultant_id", auto.consultant_id)
      .gte("ends_at", targetStart)
      .lte("ends_at", targetEnd);

    for (const formation of formations ?? []) {
      if (config.formation_ids?.length && !config.formation_ids.includes(formation.id)) continue;

      const { data: regs } = await supabase
        .from("formation_registrations")
        .select("client_id")
        .eq("formation_id", formation.id);

      for (const reg of regs ?? []) {
        const { data: client } = await supabase
          .from("profiles")
          .select("email, first_name")
          .eq("id", reg.client_id)
          .single();

        try {
          await runAutomations("delay_after_formation", auto.consultant_id, {
            client_id: reg.client_id,
            client_email: client?.email,
            client_name: client?.first_name ?? "",
            formation_id: formation.id,
            formation_title: formation.title,
            event_starts_at: formation.starts_at,
          });
          delayRuns++;
        } catch {
          // continue
        }
      }
    }
  }
  results.delay_automations_run = delayRuns;

  // ─── Generate Recurring Formations ───────────────────────────
  try {
    const recurringResult = await generateRecurringFormations();
    results.recurring_formations_generated = recurringResult.generated;
  } catch (err) {
    console.error("Failed to generate recurring formations:", err);
    results.recurring_formations_generated = -1;
    await notifyJobFailure("Generation des ateliers recurrents", err);
  }

  // ─── Schedule Workflow Actions ─────────────────────────────
  try {
    const schedulingResult = await scheduleWorkflowActionsForUpcomingFormations();
    results.workflow_actions_scheduled = schedulingResult.scheduled;
  } catch (err) {
    console.error("Failed to schedule workflow actions:", err);
    results.workflow_actions_scheduled = -1;
    await notifyJobFailure("Planification des actions d'atelier", err);
  }

  // ─── Execute Scheduled Workflow Actions ────────────────────
  try {
    const executionResult = await executeScheduledActions();
    results.workflow_actions_executed = executionResult.executed;
    results.workflow_actions_failed = executionResult.failed;
  } catch (err) {
    console.error("Failed to execute scheduled actions:", err);
    results.workflow_actions_executed = -1;
    await notifyJobFailure("Execution des actions planifiees", err);
  }

  // ─── Notifications periodiques ─────────────────────────────
  // Chaque travail verifie lui-meme sa fenetre : la frequence du cron est
  // reglee dans le tableau de bord Vercel, elle n'est pas lisible ici.
  for (const [key, run, label] of [
    ["module_reminders_sent", runModuleReminders, "Relances d'accompagnement"],
    ["review_requests_sent", runReviewRequests, "Demandes d'avis"],
    ["weekly_digests_sent", runWeeklyDigest, "Resume hebdomadaire"],
  ] as const) {
    try {
      results[key] = await run();
    } catch (err) {
      console.error(`Failed to run ${key}:`, err);
      results[key] = -1;
      await notifyJobFailure(label, err);
    }
  }

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const { error: deleteError } = await supabase
    .from("automation_logs")
    .delete()
    .lt("executed_at", sixMonthsAgo.toISOString());

  results.automation_logs_cleaned = deleteError ? -1 : 0;

  // ─── Hard delete accounts (RGPD) — 30-day grace period ────
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: pendingDeletion } = await supabase
    .from("profiles")
    .select("id")
    .not("deleted_at", "is", null)
    .lt("deleted_at", thirtyDaysAgo.toISOString());

  let hardDeleted = 0;
  for (const profile of pendingDeletion ?? []) {
    try {
      await supabase.auth.admin.deleteUser(profile.id);
      hardDeleted++;
    } catch (err) {
      console.error(`Failed to hard delete user ${profile.id}:`, err);
    }
  }
  results.accounts_hard_deleted = hardDeleted;

  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    results,
  });
};
