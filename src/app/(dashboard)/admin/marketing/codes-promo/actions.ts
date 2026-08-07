"use server";

import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { promoCodeSchema } from "@/validations/promo-codes";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionResult } from "@/types";
import type { PromoCode } from "@/types/database";

const ROUTE = "/admin/marketing/codes-promo";

const requireAdmin = async () => {
  const user = await getSessionUser();
  if (!user || !user.roles.includes("admin")) redirect("/connexion");
  return user;
};

export type PromoCodeListRow = PromoCode & {
  redemptions: number;
  revenue_cents: number;
  discount_total_cents: number;
  target_count: number;
};

export const createPromoCode = async (
  data: unknown,
): Promise<ActionResult<{ id: string }>> => {
  await requireAdmin();
  const parsed = promoCodeSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const input = parsed.data;
  const supabase = createAdminClient();

  const { data: created, error } = await supabase
    .from("promo_codes")
    .insert({
      code: input.code.toUpperCase(),
      label: input.label ?? null,
      discount_type: input.discount_type,
      discount_value: input.discount_value,
      scope_all: input.scope_all,
      valid_from: input.valid_from ?? null,
      valid_until: input.valid_until ?? null,
      max_redemptions: input.max_redemptions ?? null,
      max_per_user: input.max_per_user,
      min_order_cents: input.min_order_cents,
      trigger_delay_hours: input.trigger_delay_hours ?? null,
      is_active: input.is_active,
    })
    .select("id")
    .single();

  if (error || !created) {
    // 23505 : l'index unique sur upper(code) a mordu.
    const duplicate =
      typeof error === "object" && error !== null && "code" in error
        ? (error as { code?: string }).code === "23505"
        : false;
    return {
      success: false,
      error: duplicate ? "Ce code existe déjà." : "La création du code a échoué.",
    };
  }

  const codeId = created.id as string;

  if (!input.scope_all && input.targets.length > 0) {
    await supabase.from("promo_code_targets").insert(
      input.targets.map((target) => ({
        promo_code_id: codeId,
        target_type: target.target_type,
        target_id: target.target_id,
      })),
    );
  }

  if (input.triggers.length > 0) {
    await supabase.from("promo_code_triggers").insert(
      input.triggers.map((trigger) => ({
        promo_code_id: codeId,
        trigger_type: trigger.trigger_type,
        target_id: trigger.target_id,
      })),
    );
  }

  revalidatePath(ROUTE);
  return { success: true, data: { id: codeId } };
};

export const updatePromoCode = async (
  id: string,
  data: unknown,
): Promise<ActionResult<{ id: string }>> => {
  await requireAdmin();
  const parsed = promoCodeSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const input = parsed.data;
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("promo_codes")
    .update({
      code: input.code.toUpperCase(),
      label: input.label ?? null,
      discount_type: input.discount_type,
      discount_value: input.discount_value,
      scope_all: input.scope_all,
      valid_from: input.valid_from ?? null,
      valid_until: input.valid_until ?? null,
      max_redemptions: input.max_redemptions ?? null,
      max_per_user: input.max_per_user,
      min_order_cents: input.min_order_cents,
      trigger_delay_hours: input.trigger_delay_hours ?? null,
      is_active: input.is_active,
    })
    .eq("id", id);

  if (error) return { success: false, error: "La mise à jour a échoué." };

  // Cibles et declencheurs sont remplaces en bloc : plus simple qu'un diff, et
  // sans consequence — ces lignes ne portent aucun historique.
  await supabase.from("promo_code_targets").delete().eq("promo_code_id", id);
  await supabase.from("promo_code_triggers").delete().eq("promo_code_id", id);

  if (!input.scope_all && input.targets.length > 0) {
    await supabase.from("promo_code_targets").insert(
      input.targets.map((target) => ({
        promo_code_id: id,
        target_type: target.target_type,
        target_id: target.target_id,
      })),
    );
  }

  if (input.triggers.length > 0) {
    await supabase.from("promo_code_triggers").insert(
      input.triggers.map((trigger) => ({
        promo_code_id: id,
        trigger_type: trigger.trigger_type,
        target_id: trigger.target_id,
      })),
    );
  }

  revalidatePath(ROUTE);
  return { success: true, data: { id } };
};

export const togglePromoCode = async (
  id: string,
  isActive: boolean,
): Promise<ActionResult<null>> => {
  await requireAdmin();
  const { error } = await createAdminClient()
    .from("promo_codes")
    .update({ is_active: isActive })
    .eq("id", id);

  if (error) return { success: false, error: "Le changement d'état a échoué." };

  revalidatePath(ROUTE);
  return { success: true, data: null };
};

export const listPromoCodes = async (): Promise<PromoCodeListRow[]> => {
  await requireAdmin();
  const supabase = createAdminClient();

  const { data: codes } = await supabase
    .from("promo_codes")
    .select("*, promo_code_targets(id)")
    .order("created_at", { ascending: false });

  const { data: redemptions } = await supabase
    .from("promo_code_redemptions")
    .select("promo_code_id, discount_cents, final_amount_cents")
    .eq("status", "confirmed");

  const totals = new Map<
    string,
    { count: number; revenue: number; discount: number }
  >();

  for (const row of redemptions ?? []) {
    const key = row.promo_code_id as string;
    const current = totals.get(key) ?? { count: 0, revenue: 0, discount: 0 };
    current.count += 1;
    current.revenue += (row.final_amount_cents as number) ?? 0;
    current.discount += (row.discount_cents as number) ?? 0;
    totals.set(key, current);
  }

  return (codes ?? []).map((code) => {
    const stats = totals.get(code.id as string);
    const targets = (code as { promo_code_targets?: unknown[] })
      .promo_code_targets;
    return {
      ...(code as PromoCode),
      redemptions: stats?.count ?? 0,
      revenue_cents: stats?.revenue ?? 0,
      discount_total_cents: stats?.discount ?? 0,
      target_count: targets?.length ?? 0,
    };
  });
};

export type PromoCodeDetail = PromoCode & {
  targets: { target_type: string; target_id: string | null }[];
  triggers: { trigger_type: string; target_id: string | null }[];
};

export const getPromoCode = async (
  id: string,
): Promise<PromoCodeDetail | null> => {
  await requireAdmin();

  const { data } = await createAdminClient()
    .from("promo_codes")
    .select(
      "*, promo_code_targets(target_type, target_id), promo_code_triggers(trigger_type, target_id)",
    )
    .eq("id", id)
    .maybeSingle();

  if (!data) return null;

  const row = data as PromoCode & {
    promo_code_targets: PromoCodeDetail["targets"] | null;
    promo_code_triggers: PromoCodeDetail["triggers"] | null;
  };

  return {
    ...row,
    targets: row.promo_code_targets ?? [],
    triggers: row.promo_code_triggers ?? [],
  };
};

export const getPromoCodeStats = async (
  id: string,
): Promise<{
  redemptions: number;
  revenueCents: number;
  discountCents: number;
  byItem: { label: string; count: number }[];
}> => {
  await requireAdmin();

  const { data } = await createAdminClient()
    .from("promo_code_redemptions")
    .select("order_kind, reference_id, discount_cents, final_amount_cents")
    .eq("promo_code_id", id)
    .eq("status", "confirmed");

  const rows = data ?? [];
  const byItem = new Map<string, number>();

  for (const row of rows) {
    const key = `${row.order_kind}:${row.reference_id}`;
    byItem.set(key, (byItem.get(key) ?? 0) + 1);
  }

  return {
    redemptions: rows.length,
    revenueCents: rows.reduce(
      (sum, row) => sum + ((row.final_amount_cents as number) ?? 0),
      0,
    ),
    discountCents: rows.reduce(
      (sum, row) => sum + ((row.discount_cents as number) ?? 0),
      0,
    ),
    byItem: [...byItem.entries()].map(([label, count]) => ({ label, count })),
  };
};

/** Catalogue propose comme cibles dans le formulaire. */
export const listPromoTargetOptions = async (): Promise<{
  formations: { id: string; title: string }[];
  events: { id: string; title: string }[];
  consultationTypes: { id: string; title: string }[];
}> => {
  await requireAdmin();
  const supabase = createAdminClient();

  const [accompagnements, formations, consultationTypes] = await Promise.all([
    supabase
      .from("formations")
      .select("id, title")
      .eq("status", "published")
      .is("deleted_at", null)
      .order("title"),
    supabase
      .from("events")
      .select("id, title")
      .eq("is_published", true)
      .order("starts_at", { ascending: false }),
    supabase.from("consultation_types").select("id, title").order("title"),
  ]);

  return {
    formations: (accompagnements.data ?? []) as { id: string; title: string }[],
    events: (formations.data ?? []) as { id: string; title: string }[],
    consultationTypes: (consultationTypes.data ?? []) as {
      id: string;
      title: string;
    }[],
  };
};
