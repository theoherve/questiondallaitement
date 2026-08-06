/**
 * Pont entre l'evaluation pure et la base : charge le code, ses compteurs et
 * l'historique de la cliente, puis pose — ou non — la reservation.
 *
 * La reservation est creee avant la session Stripe (son identifiant n'existe
 * pas encore) et rattachee ensuite par `attachSessionToRedemption`. Le
 * `redemptionId` voyage dans les metadata Stripe : c'est lui que le webhook
 * confirme.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import type { PaymentType } from "@/types/database";
import { evaluatePromoCode } from "./evaluate";
import { promoRejectionMessage } from "./messages";
import {
  countRedemptions,
  loadPromoCode,
  loadTriggeringPurchases,
} from "./repository";
import type { PromoServiceKind } from "./types";

export { PENDING_TTL_HOURS } from "./repository";

const GENERIC_ERROR = "Ce code n'est pas valable pour cet achat.";

/** Fenetre d'historique chargee pour les declencheurs, en heures. */
const MAX_TRIGGER_WINDOW_HOURS = 24 * 30;

export type ResolvePromoInput = {
  code: string;
  serviceKind: PromoServiceKind;
  itemId: string;
  amountCents: number;
  profileId: string | null;
  /** `true` cote achat, `false` pour un simple apercu. */
  reserve: boolean;
  orderKind?: PaymentType;
  referenceId?: string;
};

export type ResolvedPromo =
  | {
      ok: true;
      promoCodeId: string;
      code: string;
      discountCents: number;
      finalCents: number;
      redemptionId: string | null;
    }
  | { ok: false; error: string };

export const resolvePromoForPurchase = async (
  input: ResolvePromoInput,
): Promise<ResolvedPromo> => {
  const supabase = createAdminClient();

  const code = await loadPromoCode(supabase, input.code);
  if (!code) return { ok: false, error: GENERIC_ERROR };

  const counts = await countRedemptions(supabase, code.id, input.profileId);

  const nowMs = Date.now();
  const triggeringPurchases =
    code.triggers.length > 0 && input.profileId
      ? await loadTriggeringPurchases(
          supabase,
          input.profileId,
          nowMs -
            Math.min(
              code.trigger_delay_hours ?? MAX_TRIGGER_WINDOW_HOURS,
              MAX_TRIGGER_WINDOW_HOURS,
            ) *
              3_600_000,
        )
      : [];

  const evaluation = evaluatePromoCode(code, {
    serviceKind: input.serviceKind,
    itemId: input.itemId,
    amountCents: input.amountCents,
    nowMs,
    globalRedemptions: counts.global,
    userRedemptions: counts.user,
    triggeringPurchases,
  });

  if (!evaluation.ok) {
    return { ok: false, error: promoRejectionMessage(evaluation) };
  }

  if (!input.reserve) {
    return {
      ok: true,
      promoCodeId: code.id,
      code: code.code.toUpperCase(),
      discountCents: evaluation.discountCents,
      finalCents: evaluation.finalCents,
      redemptionId: null,
    };
  }

  if (!input.profileId || !input.orderKind || !input.referenceId) {
    return { ok: false, error: GENERIC_ERROR };
  }

  const { data: redemption } = await supabase
    .from("promo_code_redemptions")
    .insert({
      promo_code_id: code.id,
      profile_id: input.profileId,
      order_kind: input.orderKind,
      reference_id: input.referenceId,
      original_amount_cents: input.amountCents,
      discount_cents: evaluation.discountCents,
      final_amount_cents: evaluation.finalCents,
      status: "pending",
    })
    .select("id")
    .maybeSingle();

  if (!redemption) {
    // Sans trace de la reservation, le quota ne serait jamais decompte : on
    // refuse la remise plutot que de l'offrir sans limite.
    return { ok: false, error: GENERIC_ERROR };
  }

  return {
    ok: true,
    promoCodeId: code.id,
    code: code.code.toUpperCase(),
    discountCents: evaluation.discountCents,
    finalCents: evaluation.finalCents,
    redemptionId: redemption.id as string,
  };
};

export const attachSessionToRedemption = async (
  redemptionId: string,
  sessionId: string,
): Promise<void> => {
  await createAdminClient()
    .from("promo_code_redemptions")
    .update({ stripe_session_id: sessionId })
    .eq("id", redemptionId);
};

/**
 * Idempotente : le filtre sur `pending` fait d'une redelivery Stripe une
 * mise a jour sans effet.
 */
export const confirmRedemption = async (
  redemptionId: string,
  paymentIntentId: string | null,
): Promise<void> => {
  await createAdminClient()
    .from("promo_code_redemptions")
    .update({
      status: "confirmed",
      confirmed_at: new Date().toISOString(),
      stripe_payment_intent_id: paymentIntentId,
    })
    .eq("id", redemptionId)
    .eq("status", "pending");
};

export const cancelRedemption = async (redemptionId: string): Promise<void> => {
  await createAdminClient()
    .from("promo_code_redemptions")
    .update({ status: "cancelled" })
    .eq("id", redemptionId)
    .eq("status", "pending");
};
