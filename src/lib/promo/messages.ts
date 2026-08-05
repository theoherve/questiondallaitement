import type { PromoEvaluation } from "./types";

const formatEuros = (cents: number): string =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);

/**
 * Un code inexistant, desactive, hors fenetre ou hors cible renvoie le meme
 * message : distinguer les cas renseignerait qui teste des codes au hasard sur
 * l'existence et le perimetre de chacun.
 */
export const promoRejectionMessage = (
  result: Extract<PromoEvaluation, { ok: false }>,
): string => {
  switch (result.reason) {
    case "min_order":
      return `Ce code s'applique à partir de ${formatEuros(
        result.minOrderCents ?? 0,
      )} d'achat.`;
    case "exhausted":
      return "Ce code a atteint son nombre maximum d'utilisations.";
    case "already_used":
      return "Vous avez déjà utilisé ce code.";
    default:
      return "Ce code n'est pas valable pour cet achat.";
  }
};
