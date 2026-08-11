"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { socialLinksSchema } from "@/validations/social-links";
import {
  DEFAULT_SOCIAL_LINKS,
  getSocialLinks,
  saveSocialLinks,
  type SocialLinks,
} from "./store";
import type { ActionResult } from "@/types";

const requireAdmin = async () => {
  const user = await getSessionUser();
  if (!user || !user.roles.includes("admin")) return null;
  return user;
};

export const getSocialLinksAction = async (): Promise<SocialLinks> => {
  const user = await requireAdmin();
  if (!user) return DEFAULT_SOCIAL_LINKS;
  return getSocialLinks();
};

export const updateSocialLinksAction = async (
  data: unknown,
): Promise<ActionResult> => {
  const user = await requireAdmin();
  if (!user) return { success: false, error: "Non autorisé" };

  const parsed = socialLinksSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const { error } = await saveSocialLinks(parsed.data as SocialLinks);
  if (error) return { success: false, error };

  const supabase = createAdminClient();
  await supabase.from("audit_logs").insert({
    user_id: user.id,
    action: "social_links_updated",
    entity_type: "platform_settings",
    entity_id: null,
    metadata: parsed.data as unknown as Record<string, unknown>,
  });

  revalidatePath("/admin/parametres");
  revalidatePath("/", "layout");
  revalidatePath("/liens");
  return { success: true };
};
