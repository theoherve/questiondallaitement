"use server";

import { getSessionUser } from "@/lib/auth";
import { sendUserBroadcast, countAudience } from "@/lib/notifications/broadcast";
import type {
  BroadcastAudience,
  BroadcastInput,
} from "@/lib/notifications/broadcast";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionResult } from "@/types";

const requireAdmin = async () => {
  const user = await getSessionUser();
  if (!user || !user.roles.includes("admin")) redirect("/connexion");
  return user;
};

export const previewBroadcast = async (
  audience: BroadcastAudience,
): Promise<number> => {
  await requireAdmin();
  return countAudience(audience);
};

export const submitBroadcast = async (
  input: BroadcastInput,
): Promise<ActionResult<{ sent: number }>> => {
  await requireAdmin();

  const title = input.title.trim();
  const body = input.body.trim();

  if (!title) return { success: false, error: "Le titre est requis" };
  if (!body) return { success: false, error: "Le message est requis" };

  // Lien interne seulement : une annonce ne doit pas pouvoir envoyer les
  // clientes vers un domaine tiers depuis un email signe de notre nom.
  if (input.href && !input.href.startsWith("/")) {
    return { success: false, error: "Le lien doit être interne" };
  }

  const { sent } = await sendUserBroadcast({ ...input, title, body });

  revalidatePath("/admin/marketing/messages");
  return { success: true, data: { sent } };
};
