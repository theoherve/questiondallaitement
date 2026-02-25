import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendBookingReminder } from "@/lib/emails/send";
import { format, addDays, startOfDay, endOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import { revalidatePath } from "next/cache";

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
    .select("id, slug")
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
        await sendBookingReminder(client.email, {
          client_name:
            `${client.first_name ?? ""} ${client.last_name ?? ""}`.trim() ||
            "Client",
          consultant_name:
            `${consultantData?.profiles?.first_name ?? ""} ${consultantData?.profiles?.last_name ?? ""}`.trim() ||
            "Consultante",
          time: format(new Date(booking.starts_at), "HH'h'mm", {
            locale: fr,
          }),
        });
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

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const { error: deleteError } = await supabase
    .from("automation_logs")
    .delete()
    .lt("executed_at", sixMonthsAgo.toISOString());

  results.automation_logs_cleaned = deleteError ? -1 : 0;

  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    results,
  });
};
