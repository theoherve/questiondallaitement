/**
 * Evaluation d'un code promo contre un contexte d'achat.
 *
 * Fonction pure, sans acces base : tout le risque metier (fenetres, quotas,
 * ciblage, arrondis) se teste ici sans mock. L'appelant fournit les compteurs
 * et l'historique deja charges.
 */

import type {
  PromoCodeWithRules,
  PromoContext,
  PromoEvaluation,
  PromoServiceKind,
} from "./types";

const ALL_TARGET_BY_KIND: Record<PromoServiceKind, string> = {
  formation: "formations_all",
  event: "events_all",
  booking: "bookings_all",
};

const ITEM_TARGET_BY_KIND: Record<PromoServiceKind, string> = {
  formation: "formation",
  event: "event",
  booking: "booking_service",
};

const matchesTarget = (code: PromoCodeWithRules, ctx: PromoContext): boolean => {
  if (code.scope_all) return true;

  return code.targets.some((target) => {
    if (target.target_type === ALL_TARGET_BY_KIND[ctx.serviceKind]) return true;
    return (
      target.target_type === ITEM_TARGET_BY_KIND[ctx.serviceKind] &&
      target.target_id === ctx.itemId
    );
  });
};

const triggerSatisfied = (
  code: PromoCodeWithRules,
  ctx: PromoContext,
): boolean => {
  if (code.triggers.length === 0) return true;

  // Un declencheur sans delai n'aurait pas de borne : on refuse plutot que de
  // rendre le code eternellement valable pour toute cliente ayant achete un
  // jour.
  const delayHours = code.trigger_delay_hours;
  if (delayHours == null) return false;

  const floor = ctx.nowMs - delayHours * 3_600_000;

  return code.triggers.some((trigger) => {
    const kind: PromoServiceKind =
      trigger.trigger_type === "event_purchase" ? "event" : "formation";

    return ctx.triggeringPurchases.some(
      (purchase) =>
        purchase.kind === kind &&
        (trigger.target_id === null || trigger.target_id === purchase.itemId) &&
        purchase.purchasedAtMs >= floor &&
        purchase.purchasedAtMs <= ctx.nowMs,
    );
  });
};

export const evaluatePromoCode = (
  code: PromoCodeWithRules,
  ctx: PromoContext,
): PromoEvaluation => {
  if (!code.is_active) return { ok: false, reason: "not_applicable" };

  if (code.valid_from && ctx.nowMs < Date.parse(code.valid_from)) {
    return { ok: false, reason: "not_applicable" };
  }

  if (code.valid_until && ctx.nowMs > Date.parse(code.valid_until)) {
    return { ok: false, reason: "not_applicable" };
  }

  if (!matchesTarget(code, ctx)) return { ok: false, reason: "not_applicable" };

  if (ctx.amountCents < code.min_order_cents) {
    return {
      ok: false,
      reason: "min_order",
      minOrderCents: code.min_order_cents,
    };
  }

  if (
    code.max_redemptions !== null &&
    ctx.globalRedemptions >= code.max_redemptions
  ) {
    return { ok: false, reason: "exhausted" };
  }

  if (ctx.userRedemptions >= code.max_per_user) {
    return { ok: false, reason: "already_used" };
  }

  if (!triggerSatisfied(code, ctx)) {
    return { ok: false, reason: "not_applicable" };
  }

  const raw =
    code.discount_type === "percent"
      ? Math.round((ctx.amountCents * code.discount_value) / 100)
      : code.discount_value;

  const discountCents = Math.min(raw, ctx.amountCents);

  return {
    ok: true,
    discountCents,
    finalCents: ctx.amountCents - discountCents,
  };
};
