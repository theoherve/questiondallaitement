import type { SupabaseClient } from "@supabase/supabase-js";
import {
  WITHDRAWAL_TEXTS,
  WITHDRAWAL_TEXT_VERSION,
  type WithdrawalContext,
} from "./withdrawal";

/**
 * Consigne la renonciation au droit de retractation.
 *
 * Le texte accepte est stocke **en entier**, pas seulement sa version : une
 * version seule obligerait a retrouver le libelle correspondant dans une
 * revision du code pour savoir ce que la cliente a lu. La preuve doit se
 * suffire a elle-meme.
 *
 * Renvoie `false` si l'ecriture echoue. Contrairement a un email, cette trace
 * n'est pas accessoire : sans elle, la plateforme ne peut pas prouver la
 * renonciation, et l'appelant doit pouvoir refuser la vente plutot que
 * d'encaisser sans preuve.
 */
export const recordWithdrawalWaiver = async (
  supabase: SupabaseClient,
  {
    clientId,
    context,
    referenceId,
  }: {
    clientId: string;
    context: WithdrawalContext;
    referenceId: string;
  },
): Promise<boolean> => {
  const { error } = await supabase.from("withdrawal_waivers").insert({
    client_id: clientId,
    context,
    reference_id: referenceId,
    text_version: WITHDRAWAL_TEXT_VERSION,
    accepted_text: WITHDRAWAL_TEXTS[context],
  });

  if (error) {
    console.error(
      "[recordWithdrawalWaiver] renonciation non enregistree — " +
        "la migration 00052 est-elle appliquee ?",
      error.message,
    );
    return false;
  }

  return true;
};
