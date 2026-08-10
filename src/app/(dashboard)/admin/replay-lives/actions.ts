"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { notify, resolveAudience } from "@/lib/notifications";
import type { ActionResult } from "@/types";

const requireAdmin = async () => {
  const user = await getSessionUser();
  if (!user || !user.roles.includes("admin")) redirect("/connexion");
  return user;
};

const replayLiveSchema = z.object({
  title: z.string().min(1, "Le titre est requis"),
  vimeo_url: z
    .string()
    .url("L'URL doit être valide")
    .refine((url) => url.includes("vimeo.com"), {
      message: "L'URL doit provenir de vimeo.com",
    }),
  description: z.string().optional().nullable(),
  live_date: z.string().min(1, "La date est requise"),
});

export type ReplayLiveFormData = z.infer<typeof replayLiveSchema>;

// ─── Create ─────────────────────────────────────────────────

export const createReplayLive = async (
  data: unknown,
  options: { notifyHolders?: boolean } = {},
): Promise<ActionResult<{ id: string }>> => {
  await requireAdmin();

  const parsed = replayLiveSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const supabase = createAdminClient();
  const { data: created, error } = await supabase
    .from("replay_lives")
    .insert(parsed.data)
    .select("id")
    .single();

  if (error) {
    return { success: false, error: "Erreur lors de la création" };
  }

  revalidatePath("/replay-lives");
  revalidatePath("/admin/replay-lives");

  // Desactive par defaut : republier un replay corrige ne doit pas renotifier
  // tout le monde. Le dedupeId protege en plus d'un double envoi.
  if (options.notifyHolders) {
    const recipients = await resolveAudience("replay_published", {
      kind: "accompagnement_holders",
    });

    await notify(
      "replay_published",
      recipients,
      { replay_id: created.id, title: parsed.data.title },
      { dedupeId: created.id },
    );
  }

  return { success: true, data: created };
};

// ─── Update ─────────────────────────────────────────────────

export const updateReplayLive = async (
  id: string,
  data: unknown,
): Promise<ActionResult> => {
  await requireAdmin();

  const parsed = replayLiveSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("replay_lives")
    .update(parsed.data)
    .eq("id", id);

  if (error) {
    return { success: false, error: "Erreur lors de la mise à jour" };
  }

  revalidatePath("/replay-lives");
  revalidatePath("/admin/replay-lives");
  revalidatePath(`/admin/replay-lives/${id}/edit`);

  return { success: true };
};

// ─── Delete ─────────────────────────────────────────────────

export const deleteReplayLive = async (id: string): Promise<ActionResult> => {
  await requireAdmin();

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("replay_lives")
    .delete()
    .eq("id", id);

  if (error) {
    return { success: false, error: "Erreur lors de la suppression" };
  }

  revalidatePath("/replay-lives");
  revalidatePath("/admin/replay-lives");

  return { success: true };
};
