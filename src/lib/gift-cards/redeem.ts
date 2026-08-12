import type { SupabaseClient } from "@supabase/supabase-js";

export type RedeemGiftCardInput = {
  code: string;
  amountCents: number;
  bookingId?: string;
  invoiceId?: string;
  recordedBy: string;
};

export type RedeemGiftCardError =
  | "not_found"
  | "not_active"
  | "expired"
  | "already_used"
  | "insufficient_balance"
  /**
   * La facture visee n'appartient pas a la consultante qui a emis la carte.
   * Mappe explicitement plutot que replie sur "unknown" : c'est le signe d'un
   * bug de plomberie ou d'un appel malveillant, et le confondre avec une
   * erreur inconnue rendrait le diagnostic impossible.
   */
  | "invoice_mismatch"
  | "unknown";

export type RedeemGiftCardResult =
  | { ok: true; redemptionId: string; amountCents: number }
  | { ok: false; error: RedeemGiftCardError };

const ERROR_MAP: Record<string, RedeemGiftCardError> = {
  gift_card_not_found: "not_found",
  gift_card_not_active: "not_active",
  gift_card_expired: "expired",
  gift_card_already_used: "already_used",
  gift_card_insufficient_balance: "insufficient_balance",
  invoice_consultant_mismatch: "invoice_mismatch",
};

export const redeemGiftCard = async (
  supabase: SupabaseClient,
  input: RedeemGiftCardInput,
): Promise<RedeemGiftCardResult> => {
  const { data, error } = await supabase.rpc("redeem_gift_card", {
    p_code: input.code,
    p_amount_cents: input.amountCents,
    p_booking_id: input.bookingId ?? null,
    p_invoice_id: input.invoiceId ?? null,
    p_recorded_by: input.recordedBy,
  });

  if (error) {
    const message = (error as { message?: string }).message ?? "";
    return { ok: false, error: ERROR_MAP[message] ?? "unknown" };
  }

  const row = data as { id: string; amount_cents: number };
  return { ok: true, redemptionId: row.id, amountCents: row.amount_cents };
};
