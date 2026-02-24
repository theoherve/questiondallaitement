"use server";

import { hash, compare } from "bcryptjs";
import { getSupabaseAndUser } from "@/lib/supabase/server-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/types";

const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, "Mot de passe actuel requis"),
    new_password: z
      .string()
      .min(8, "Le mot de passe doit contenir au moins 8 caractères"),
    confirm_password: z.string(),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirm_password"],
  });

export const changePassword = async (
  formData: FormData
): Promise<ActionResult> => {
  const { user } = await getSupabaseAndUser();

  const parsed = changePasswordSchema.safeParse({
    current_password: formData.get("current_password"),
    new_password: formData.get("new_password"),
    confirm_password: formData.get("confirm_password"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Données invalides" };
  }

  const adminClient = createAdminClient();
  const { data: profile } = await adminClient
    .from("profiles")
    .select("password_hash")
    .eq("id", user.id)
    .single();

  if (!profile?.password_hash) {
    return {
      success: false,
      error: "Impossible de changer le mot de passe. Contactez le support.",
    };
  }

  const isValid = await compare(parsed.data.current_password, profile.password_hash);
  if (!isValid) {
    return { success: false, error: "Le mot de passe actuel est incorrect" };
  }

  const newHash = await hash(parsed.data.new_password, 10);

  const { error } = await adminClient
    .from("profiles")
    .update({ password_hash: newHash })
    .eq("id", user.id);

  if (error) {
    return { success: false, error: "Erreur lors de la mise à jour" };
  }

  revalidatePath("/espace-client/profil");
  return { success: true };
};

export const updateClientProfile = async (
  formData: FormData
): Promise<ActionResult> => {
  const { supabase, user } = await getSupabaseAndUser();

  const { error } = await supabase
    .from("profiles")
    .update({
      first_name: formData.get("first_name") as string,
      last_name: formData.get("last_name") as string,
      phone: (formData.get("phone") as string) || null,
    })
    .eq("id", user.id);

  if (error) {
    return { success: false, error: "Erreur lors de la mise à jour" };
  }

  revalidatePath("/espace-client/profil");
  return { success: true };
};
