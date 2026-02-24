"use server";

import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  promoteToConsultantSchema,
  updateConsultantSchema,
} from "@/validations/consultants";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionResult } from "@/types";

const requireAdmin = async () => {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") redirect("/connexion");
  return user;
};

export const searchUsers = async (
  query: string
): Promise<
  ActionResult<
    {
      id: string;
      email: string;
      first_name: string | null;
      last_name: string | null;
      role: string;
    }[]
  >
> => {
  await requireAdmin();
  if (!query || query.length < 2) {
    return { success: true, data: [] };
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, first_name, last_name, role")
    .or(`email.ilike.%${query}%,first_name.ilike.%${query}%,last_name.ilike.%${query}%`)
    .not("role", "eq", "consultant")
    .is("deleted_at", null)
    .limit(10);

  if (error) {
    return { success: false, error: "Erreur lors de la recherche" };
  }

  return { success: true, data: data ?? [] };
};

export const promoteToConsultant = async (
  data: unknown
): Promise<ActionResult<{ id: string }>> => {
  await requireAdmin();

  const parsed = promoteToConsultantSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const { user_id, slug, bio, specialties, commission_rate } = parsed.data;
  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from("consultants")
    .select("id")
    .eq("id", user_id)
    .single();

  if (existing) {
    return { success: false, error: "Cet utilisateur est déjà consultant·e" };
  }

  const { data: slugCheck } = await supabase
    .from("consultants")
    .select("id")
    .eq("slug", slug)
    .single();

  if (slugCheck) {
    return { success: false, error: "Ce slug est déjà utilisé" };
  }

  const { error: roleError } = await supabase
    .from("profiles")
    .update({ role: "consultant" })
    .eq("id", user_id);

  if (roleError) {
    return { success: false, error: "Erreur lors de la mise à jour du rôle" };
  }

  const { error: consultantError } = await supabase
    .from("consultants")
    .insert({
      id: user_id,
      slug,
      bio: bio ?? null,
      specialties: specialties ?? [],
      commission_rate,
      is_active: false,
    });

  if (consultantError) {
    await supabase
      .from("profiles")
      .update({ role: "client" })
      .eq("id", user_id);
    return { success: false, error: "Erreur lors de la création du profil consultant" };
  }

  revalidatePath("/admin/consultantes");
  return { success: true, data: { id: user_id } };
};

export const updateConsultant = async (
  id: string,
  data: unknown
): Promise<ActionResult> => {
  await requireAdmin();

  const parsed = updateConsultantSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const supabase = createAdminClient();

  if (parsed.data.slug) {
    const { data: slugCheck } = await supabase
      .from("consultants")
      .select("id")
      .eq("slug", parsed.data.slug)
      .neq("id", id)
      .single();

    if (slugCheck) {
      return { success: false, error: "Ce slug est déjà utilisé" };
    }
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.bio !== undefined) updateData.bio = parsed.data.bio;
  if (parsed.data.specialties) updateData.specialties = parsed.data.specialties;
  if (parsed.data.commission_rate !== undefined)
    updateData.commission_rate = parsed.data.commission_rate;
  if (parsed.data.is_active !== undefined)
    updateData.is_active = parsed.data.is_active;
  if (parsed.data.slug) updateData.slug = parsed.data.slug;

  const { error } = await supabase
    .from("consultants")
    .update(updateData)
    .eq("id", id);

  if (error) {
    return { success: false, error: "Erreur lors de la mise à jour" };
  }

  revalidatePath("/admin/consultantes");
  revalidatePath(`/admin/consultantes/${id}`);
  return { success: true };
};

export const toggleConsultantActive = async (
  id: string
): Promise<ActionResult> => {
  await requireAdmin();
  const supabase = createAdminClient();

  const { data: consultant, error: fetchError } = await supabase
    .from("consultants")
    .select("is_active")
    .eq("id", id)
    .single();

  if (fetchError || !consultant) {
    return { success: false, error: "Consultante introuvable" };
  }

  const { error } = await supabase
    .from("consultants")
    .update({ is_active: !consultant.is_active })
    .eq("id", id);

  if (error) {
    return { success: false, error: "Erreur lors du changement de statut" };
  }

  revalidatePath("/admin/consultantes");
  revalidatePath(`/admin/consultantes/${id}`);
  return { success: true };
};

export const getConsultantStats = async (
  id: string
): Promise<
  ActionResult<{
    formationsCount: number;
    bookingsCount: number;
    totalRevenue: number;
  }>
> => {
  await requireAdmin();
  const supabase = createAdminClient();

  const [formations, bookings, payments] = await Promise.all([
    supabase
      .from("formations")
      .select("id", { count: "exact", head: true })
      .eq("consultant_id", id)
      .is("deleted_at", null),
    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("consultant_id", id),
    supabase
      .from("payments")
      .select("amount_cents")
      .eq("consultant_id", id)
      .eq("status", "succeeded"),
  ]);

  const totalRevenue = (payments.data ?? []).reduce(
    (sum, p) => sum + (p.amount_cents ?? 0),
    0
  );

  return {
    success: true,
    data: {
      formationsCount: formations.count ?? 0,
      bookingsCount: bookings.count ?? 0,
      totalRevenue,
    },
  };
};
