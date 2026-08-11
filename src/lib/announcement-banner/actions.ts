"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { announcementBannerSchema } from "@/validations/announcement-banner";
import {
  DEFAULT_ANNOUNCEMENT_BANNER,
  getAnnouncementBanner,
  saveAnnouncementBanner,
  type AnnouncementBanner,
} from "./store";
import type { ActionResult } from "@/types";

const requireAdmin = async () => {
  const user = await getSessionUser();
  if (!user || !user.roles.includes("admin")) return null;
  return user;
};

export const getAnnouncementBannerAction = async (): Promise<AnnouncementBanner> => {
  const user = await requireAdmin();
  if (!user) return DEFAULT_ANNOUNCEMENT_BANNER;
  return getAnnouncementBanner();
};

export const updateAnnouncementBannerAction = async (
  data: unknown,
): Promise<ActionResult> => {
  const user = await requireAdmin();
  if (!user) return { success: false, error: "Non autorisé" };

  const parsed = announcementBannerSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const { error } = await saveAnnouncementBanner(parsed.data as AnnouncementBanner);
  if (error) return { success: false, error };

  const supabase = createAdminClient();
  await supabase.from("audit_logs").insert({
    user_id: user.id,
    action: "announcement_banner_updated",
    entity_type: "platform_settings",
    entity_id: null,
    metadata: parsed.data as unknown as Record<string, unknown>,
  });

  revalidatePath("/admin/parametres");
  revalidatePath("/");
  return { success: true };
};
