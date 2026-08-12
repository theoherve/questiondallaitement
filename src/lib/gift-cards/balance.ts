import type { SupabaseClient } from "@supabase/supabase-js";

export type GiftCardLookup =
  | {
      ok: true;
      giftCardId: string;
      type: "amount" | "service";
      balanceCents: number | null;
      consultationTypeId: string | null;
      expiresAt: string;
    }
  | { ok: false; error: "not_found" | "not_active" | "expired" | "already_used" };

export const lookupGiftCard = async (
  supabase: SupabaseClient,
  code: string,
): Promise<GiftCardLookup> => {
  const { data: card } = await supabase
    .from("gift_cards")
    .select("id, type, status, expires_at, initial_amount_cents, consultation_type_id")
    .eq("code", code)
    .maybeSingle();

  if (!card) return { ok: false, error: "not_found" };
  if (card.status !== "active") return { ok: false, error: "not_active" };
  if (new Date(card.expires_at) < new Date()) return { ok: false, error: "expired" };

  const { data: redemptions } = await supabase
    .from("gift_card_redemptions")
    .select("amount_cents")
    .eq("gift_card_id", card.id);

  const used = (redemptions ?? []).reduce(
    (sum: number, r: { amount_cents: number }) => sum + r.amount_cents,
    0,
  );

  if (card.type === "service") {
    if (used > 0) return { ok: false, error: "already_used" };
    return {
      ok: true,
      giftCardId: card.id,
      type: "service",
      balanceCents: null,
      consultationTypeId: card.consultation_type_id,
      expiresAt: card.expires_at,
    };
  }

  return {
    ok: true,
    giftCardId: card.id,
    type: "amount",
    balanceCents: card.initial_amount_cents - used,
    consultationTypeId: null,
    expiresAt: card.expires_at,
  };
};
