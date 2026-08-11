"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { emailSenderSchema } from "@/validations/email-sender";
import {
  DEFAULT_EMAIL_SENDER,
  getEmailSender,
  saveEmailSender,
  type EmailSender,
} from "./store";
import type { ActionResult } from "@/types";

const requireAdmin = async () => {
  const user = await getSessionUser();
  if (!user || !user.roles.includes("admin")) return null;
  return user;
};

export const getEmailSenderAction = async (): Promise<EmailSender> => {
  const user = await requireAdmin();
  if (!user) return DEFAULT_EMAIL_SENDER;
  return getEmailSender();
};

export const updateEmailSenderAction = async (
  data: unknown,
): Promise<ActionResult> => {
  const user = await requireAdmin();
  if (!user) return { success: false, error: "Non autorisé" };

  const parsed = emailSenderSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const { error } = await saveEmailSender(parsed.data as EmailSender);
  if (error) return { success: false, error };

  const supabase = createAdminClient();
  await supabase.from("audit_logs").insert({
    user_id: user.id,
    action: "email_sender_updated",
    entity_type: "platform_settings",
    entity_id: null,
    metadata: parsed.data as unknown as Record<string, unknown>,
  });

  revalidatePath("/admin/parametres");
  return { success: true };
};
