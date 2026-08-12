/**
 * Erreurs de verification d'une carte cadeau au moment de la reservation, et
 * leurs libelles affichables.
 *
 * Module a part et non dans `reserver/actions.ts` : celui-ci porte la directive
 * `"use server"`, qui n'autorise que des fonctions asynchrones a l'export. Le
 * formulaire (composant client) a besoin des libelles, la server action des
 * codes : les deux lisent ici.
 */
export type GiftCardBookingCheckError =
  | "not_found"
  | "not_active"
  | "expired"
  | "already_used"
  | "consultation_type_mismatch";

export type GiftCardBookingCheck =
  | { ok: true; discountCents: number }
  | { ok: false; error: GiftCardBookingCheckError };

export const GIFT_CARD_ERROR_MESSAGES: Record<GiftCardBookingCheckError, string> = {
  not_found: "Ce code cadeau est inconnu.",
  not_active: "Cette carte cadeau n'est plus utilisable.",
  expired: "Cette carte cadeau est expirée.",
  already_used: "Cette carte cadeau a déjà été utilisée.",
  consultation_type_mismatch:
    "Cette carte cadeau est valable pour une autre prestation.",
};

export const giftCardErrorMessage = (
  error: GiftCardBookingCheckError | string,
): string =>
  GIFT_CARD_ERROR_MESSAGES[error as GiftCardBookingCheckError] ??
  "Ce code cadeau n'est pas utilisable pour cette réservation.";
