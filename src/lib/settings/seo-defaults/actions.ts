"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { seoDefaultsSchema } from "@/validations/seo-defaults";
import {
  DEFAULT_SEO_DEFAULTS,
  getSeoDefaults,
  saveSeoDefaults,
  type SeoDefaults,
} from "./store";
import type { ActionResult } from "@/types";

const requireAdmin = async () => {
  const user = await getSessionUser();
  if (!user || !user.roles.includes("admin")) return null;
  return user;
};

export const getSeoDefaultsAction = async (): Promise<SeoDefaults> => {
  const user = await requireAdmin();
  if (!user) return DEFAULT_SEO_DEFAULTS;
  return getSeoDefaults();
};

export const updateSeoDefaultsAction = async (
  data: unknown,
): Promise<ActionResult> => {
  const user = await requireAdmin();
  if (!user) return { success: false, error: "Non autorisé" };

  const parsed = seoDefaultsSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const { error } = await saveSeoDefaults(parsed.data as SeoDefaults);
  if (error) return { success: false, error };

  const supabase = createAdminClient();
  await supabase.from("audit_logs").insert({
    user_id: user.id,
    action: "seo_defaults_updated",
    entity_type: "platform_settings",
    entity_id: null,
    metadata: parsed.data as unknown as Record<string, unknown>,
  });

  revalidatePath("/admin/parametres");
  revalidatePath("/cgv");
  revalidatePath("/mentions-legales");
  revalidatePath("/politique-de-confidentialite");
  revalidatePath("/newsletter/desinscription");
  return { success: true };
};
