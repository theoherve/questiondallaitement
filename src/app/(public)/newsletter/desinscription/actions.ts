"use server";

import {
  resubscribeByToken,
  unsubscribeByToken,
} from "@/lib/newsletter/unsubscribe";

/**
 * Desinscription depuis la page de confirmation.
 *
 * Une action serveur, donc un POST — c'est le point essentiel. Le lien de
 * desinscription circule dans des emails, et les passerelles de securite
 * prechargent les URL qu'ils contiennent. Constate en recette : une adresse
 * professionnelle a ete desinscrite vingt secondes apres reception du premier
 * email, sans qu'aucun humain ne clique, et l'abonnee n'en aurait jamais rien
 * su. Un GET ne doit donc rien modifier.
 *
 * Le jeton fait office d'autorisation : il ne permet d'agir que sur la ligne de
 * la personne qui a recu le lien.
 */
export const unsubscribe = async (token: string): Promise<boolean> => {
  const outcome = await unsubscribeByToken(token);
  return outcome.status !== "unknown_token";
};

/**
 * Reabonnement depuis la page de desinscription.
 *
 * Meme autorisation par jeton, meme portee : sa propre ligne.
 */
export const resubscribe = async (token: string): Promise<boolean> =>
  resubscribeByToken(token);
