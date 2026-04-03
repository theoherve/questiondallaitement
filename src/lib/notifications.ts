import { createAdminClient } from "@/lib/supabase/admin";

type NotificationType = "booking_confirmed" | "consultant_message" | "admin";

export const createNotification = async (
  userId: string,
  type: NotificationType,
  title: string,
  body?: string,
  metadata?: Record<string, unknown>
): Promise<void> => {
  const supabase = createAdminClient();
  const { error } = await supabase.from("notifications").insert({
    user_id: userId,
    type,
    title,
    body: body ?? null,
    metadata: metadata ?? null,
  });
  if (error) {
    console.error(`Failed to create notification for user ${userId}:`, error);
  }
};
