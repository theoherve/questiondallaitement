"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult } from "@/types";

const requireAdmin = async () => {
  const user = await getSessionUser();
  if (!user || !user.roles.includes("admin")) redirect("/connexion");
  return user;
};

export type ContactMessageStatus = "nouveau" | "lu" | "traite";

export type ContactMessageRow = {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: ContactMessageStatus;
  created_at: string;
};

export const listContactMessages = async (
  statusFilter?: ContactMessageStatus,
): Promise<ContactMessageRow[]> => {
  await requireAdmin();

  let query = createAdminClient()
    .from("contact_messages")
    .select("id, name, email, subject, message, status, created_at")
    .order("created_at", { ascending: false });

  if (statusFilter) query = query.eq("status", statusFilter);

  const { data } = await query;
  return (data ?? []) as ContactMessageRow[];
};

/**
 * Charge un message et le marque `lu` s'il etait `nouveau`. Le passage en lu
 * fait partie de l'ouverture du detail, pas d'une action separee : c'est la
 * regle produit (voir spec).
 */
export const getContactMessageForAdmin = async (
  id: string,
): Promise<ContactMessageRow | null> => {
  await requireAdmin();

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("contact_messages")
    .select("id, name, email, subject, message, status, created_at")
    .eq("id", id)
    .maybeSingle();

  if (!data) return null;

  if (data.status === "nouveau") {
    await supabase
      .from("contact_messages")
      .update({ status: "lu", updated_at: new Date().toISOString() })
      .eq("id", id);
    return { ...data, status: "lu" } as ContactMessageRow;
  }

  return data as ContactMessageRow;
};

export const markContactMessageTreated = async (
  id: string,
): Promise<ActionResult> => {
  await requireAdmin();

  const { error } = await createAdminClient()
    .from("contact_messages")
    .update({ status: "traite", updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { success: false, error: "Mise à jour impossible" };

  revalidatePath("/admin/contact");
  revalidatePath(`/admin/contact/${id}`);
  return { success: true };
};
