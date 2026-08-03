"use server";

import { resubscribeByToken } from "@/lib/newsletter/unsubscribe";

/**
 * Reabonnement depuis la page de desinscription.
 *
 * Le jeton fait office d'autorisation : seule la personne qui detient le lien
 * recu par email peut reactiver l'abonnement, et il ne permet d'agir que sur sa
 * propre ligne.
 */
export const resubscribe = async (token: string): Promise<boolean> =>
  resubscribeByToken(token);
