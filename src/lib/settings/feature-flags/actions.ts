"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { featureFlagsSchema } from "@/validations/feature-flags";
import {
  DEFAULT_FEATURE_FLAGS,
  getFeatureFlags,
  saveFeatureFlags,
  type FeatureFlags,
} from "./store";
import type { ActionResult } from "@/types";

const requireAdmin = async () => {
  const user = await getSessionUser();
  if (!user || !user.roles.includes("admin")) return null;
  return user;
};

export const getFeatureFlagsAction = async (): Promise<FeatureFlags> => {
  const user = await requireAdmin();
  if (!user) return DEFAULT_FEATURE_FLAGS;
  return getFeatureFlags();
};

export const updateFeatureFlagsAction = async (
  data: unknown,
): Promise<ActionResult> => {
  const user = await requireAdmin();
  if (!user) return { success: false, error: "Non autorisé" };

  const parsed = featureFlagsSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const { error } = await saveFeatureFlags(parsed.data as FeatureFlags);
  if (error) return { success: false, error };

  const supabase = createAdminClient();
  await supabase.from("audit_logs").insert({
    user_id: user.id,
    action: "feature_flags_updated",
    entity_type: "platform_settings",
    entity_id: null,
    metadata: parsed.data as unknown as Record<string, unknown>,
  });

  // Le flag conditionne des blocs dans quasi toutes les pages publiques et
  // l'espace client (nav, CTA) : on invalide tout le site plutôt que de
  // lister chaque route individuellement.
  revalidatePath("/", "layout");
  return { success: true };
};
