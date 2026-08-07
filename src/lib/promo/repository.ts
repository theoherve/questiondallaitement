import type { SupabaseClient } from "@supabase/supabase-js";
import type { PromoCodeWithRules, PromoPurchase } from "./types";

/**
 * Duree au-dela de laquelle une reservation non confirmee cesse de peser sur
 * les quotas. Sans cette borne, trois onglets ouverts epuisent un code a quota
 * limite sans qu'aucun paiement n'aboutisse.
 */
export const PENDING_TTL_HOURS = 24;

export const loadPromoCode = async (
  supabase: SupabaseClient,
  code: string,
): Promise<PromoCodeWithRules | null> => {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return null;

  const { data } = await supabase
    .from("promo_codes")
    .select(
      "*, promo_code_targets(target_type, target_id), promo_code_triggers(trigger_type, target_id)",
    )
    .ilike("code", normalized)
    .maybeSingle();

  if (!data) return null;

  const row = data as PromoCodeWithRules & {
    promo_code_targets: PromoCodeWithRules["targets"];
    promo_code_triggers: PromoCodeWithRules["triggers"];
  };

  return {
    ...row,
    targets: row.promo_code_targets ?? [],
    triggers: row.promo_code_triggers ?? [],
  };
};

export const countRedemptions = async (
  supabase: SupabaseClient,
  promoCodeId: string,
  profileId: string | null,
): Promise<{ global: number; user: number }> => {
  const cutoff = new Date(
    Date.now() - PENDING_TTL_HOURS * 3_600_000,
  ).toISOString();

  // Les reservations recentes comptent au meme titre que les confirmations :
  // le quota doit tenir pendant la traversee du tunnel Stripe.
  const activeFilter = `status.eq.confirmed,and(status.eq.pending,created_at.gte.${cutoff})`;

  const { count: global } = await supabase
    .from("promo_code_redemptions")
    .select("id", { count: "exact", head: true })
    .eq("promo_code_id", promoCodeId)
    .or(activeFilter);

  if (!profileId) return { global: global ?? 0, user: 0 };

  const { count: user } = await supabase
    .from("promo_code_redemptions")
    .select("id", { count: "exact", head: true })
    .eq("promo_code_id", promoCodeId)
    .eq("profile_id", profileId)
    .or(activeFilter);

  return { global: global ?? 0, user: user ?? 0 };
};

export const loadTriggeringPurchases = async (
  supabase: SupabaseClient,
  profileId: string,
  sinceMs: number,
): Promise<PromoPurchase[]> => {
  const { data } = await supabase
    .from("payments")
    .select("type, reference_id, created_at")
    .eq("client_id", profileId)
    .eq("status", "succeeded")
    .in("type", ["formation", "accompagnement"])
    .gte("created_at", new Date(sinceMs).toISOString());

  return (data ?? []).map((row) => ({
    kind: row.type as PromoPurchase["kind"],
    itemId: row.reference_id as string,
    purchasedAtMs: Date.parse(row.created_at as string),
  }));
};
