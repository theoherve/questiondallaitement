import type { SupabaseClient } from "@supabase/supabase-js";
import {
  isBillingComplete,
  type BillingProfile,
} from "./billing-profile";

/**
 * Lit l'identite de facturation d'une consultante, et dit si elle peut vendre.
 *
 * Requete a part, tolerante a l'absence des colonnes : tant que la migration
 * 00053 n'est pas appliquee, PostgREST rejetterait toute requete qui les
 * selectionne (« column does not exist »). On la traite alors comme un profil
 * incomplet — la vente est refusee, jamais encaissee sans pouvoir facturer.
 *
 * Meme raison que `isPlatformOwnerConsultant` d'utiliser le client reel : un
 * sous-type ecrit a la main fait exploser l'inference des generiques Supabase.
 */
type Reader = SupabaseClient;

export type ConsultantBilling = BillingProfile & {
  billing_legal_form: string | null;
};

export const getConsultantBilling = async (
  supabase: Reader,
  consultantId: string,
): Promise<ConsultantBilling | null> => {
  const { data, error } = await supabase
    .from("consultants")
    .select(
      "billing_legal_name, billing_address, billing_siren, billing_vat_number, billing_legal_form",
    )
    .eq("id", consultantId)
    .maybeSingle();

  if (error) {
    console.error(
      "[getConsultantBilling] lecture impossible — " +
        "la migration 00053 est-elle appliquee ?",
      error.message,
    );
    return null;
  }

  return (data as ConsultantBilling | null) ?? null;
};

/**
 * Une consultante ne peut vendre en ligne que si elle peut facturer, donc si
 * son profil de facturation est complet. Une lecture impossible vaut « non ».
 */
export const consultantCanSell = async (
  supabase: Reader,
  consultantId: string,
): Promise<boolean> => {
  const billing = await getConsultantBilling(supabase, consultantId);
  return billing !== null && isBillingComplete(billing);
};
