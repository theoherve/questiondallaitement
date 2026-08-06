"use server";

import { getSessionUser } from "@/lib/auth";
import { PROMO_RATE_LIMIT, rateLimit } from "@/lib/rate-limit";
import { resolvePromoForPurchase } from "@/lib/promo/reserve";
import type { PromoServiceKind } from "@/lib/promo/types";
import type { ActionResult } from "@/types";

/**
 * Apercu d'une remise avant paiement. Aucun effet de bord : la reservation est
 * posee plus tard, par l'action d'achat. Le montant renvoye ici est indicatif —
 * il est recalcule cote serveur au moment de creer la session Stripe.
 */
export const previewPromoCode = async (input: {
  code: string;
  serviceKind: PromoServiceKind;
  itemId: string;
  amountCents: number;
}): Promise<
  ActionResult<{ code: string; discountCents: number; finalCents: number }>
> => {
  const limit = await rateLimit(PROMO_RATE_LIMIT);
  if (!limit.success) {
    return {
      success: false,
      error: "Trop d'essais. Réessayez dans quelques minutes.",
    };
  }

  if (!input.code?.trim()) {
    return { success: false, error: "Saisissez un code." };
  }

  const user = await getSessionUser();

  const resolved = await resolvePromoForPurchase({
    code: input.code,
    serviceKind: input.serviceKind,
    itemId: input.itemId,
    amountCents: input.amountCents,
    profileId: user?.id ?? null,
    reserve: false,
  });

  if (!resolved.ok) return { success: false, error: resolved.error };

  return {
    success: true,
    data: {
      code: resolved.code,
      discountCents: resolved.discountCents,
      finalCents: resolved.finalCents,
    },
  };
};
