"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { emailBrandingSchema } from "@/validations/email-branding";
import { DEFAULT_EMAIL_BRANDING, type EmailBranding } from "./branding";
import { getEmailBranding, saveEmailBranding } from "./branding-store";
import type { ActionResult } from "@/types";

const requireAdmin = async () => {
  const user = await getSessionUser();
  if (!user || !user.roles.includes("admin")) return null;
  return user;
};

/**
 * Lecture de l'identite visuelle pour un composant client (editeur de blocs,
 * qui propose l'insertion du logo et de la banniere pre-definis).
 */
export const getEmailBrandingAction = async (): Promise<EmailBranding> => {
  const user = await requireAdmin();
  if (!user) return DEFAULT_EMAIL_BRANDING;
  return getEmailBranding();
};

export const updateEmailBrandingAction = async (
  data: unknown,
): Promise<ActionResult> => {
  const user = await requireAdmin();
  if (!user) return { success: false, error: "Non autorisé" };

  const parsed = emailBrandingSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const { error } = await saveEmailBranding(parsed.data as EmailBranding);
  if (error) return { success: false, error };

  const supabase = createAdminClient();
  await supabase.from("audit_logs").insert({
    user_id: user.id,
    action: "email_branding_updated",
    entity_type: "platform_settings",
    entity_id: null,
    metadata: parsed.data as unknown as Record<string, unknown>,
  });

  revalidatePath("/admin/parametres");
  revalidatePath("/admin/marketing");
  return { success: true };
};
