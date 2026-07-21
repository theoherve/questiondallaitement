import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Ou vont les fonds d'une vente, et quelle commission s'applique.
 *
 * Trois cas, decides ici plutot que disperses dans chaque action de paiement :
 *
 * - **consultante tierce** : charge destination classique, elle recoit les
 *   fonds et la plateforme retient sa commission ;
 * - **consultante proprietaire de la plateforme** : la charge reste sur la
 *   plateforme et aucune commission n'est prelevee. Router son encaissement
 *   vers un compte connecte lui appartenant serait un aller-retour — les fonds
 *   partent chez elle pour revenir chez elle, en passant par un compte Express
 *   qui peut etre facture — et la commission qu'elle se verserait a elle-meme
 *   apparaitrait dans les reversements comme un flux reel ;
 * - **vente a partager** : la charge reste sur la plateforme, sans quoi elle
 *   n'aurait plus les fonds pour payer les collaboratrices (cf. 4-6).
 */

export type SaleRouting = {
  /** La plateforme encaisse au lieu de virer directement. */
  holdOnPlatform: boolean;
  /** Compte destinataire de la charge, ou `null` si elle reste sur la plateforme. */
  destinationAccountId: string | null;
  /** Taux effectivement applique, qui peut differer de celui de la fiche. */
  commissionRate: number;
};

export const routeSale = ({
  isPlatformOwner,
  stripeAccountId,
  commissionRate,
  hasCollaborators,
}: {
  isPlatformOwner: boolean;
  stripeAccountId: string | null;
  commissionRate: number;
  hasCollaborators: boolean;
}): SaleRouting | null => {
  if (isPlatformOwner) {
    return {
      holdOnPlatform: true,
      destinationAccountId: null,
      commissionRate: 0,
    };
  }

  // Ni destinataire ni statut de proprietaire : l'argent resterait sur la
  // plateforme sans que personne ne soit cense le recevoir. On refuse la vente
  // plutot que d'encaisser sans savoir a qui reverser.
  if (!stripeAccountId) return null;

  if (hasCollaborators) {
    return {
      holdOnPlatform: true,
      destinationAccountId: null,
      commissionRate,
    };
  }

  return {
    holdOnPlatform: false,
    destinationAccountId: stripeAccountId,
    commissionRate,
  };
};

/**
 * Le client Supabase reel plutot qu'un sous-ensemble ecrit a la main : decrire
 * la chaine de query soi-meme fait exploser l'inference de TypeScript au
 * contact des generiques de la lib (« Type instantiation is excessively
 * deep »). Les tests passent un double, via un cast.
 */
type Reader = SupabaseClient;

/**
 * Dit si la consultante est la proprietaire de la plateforme.
 *
 * Requete a part, et non une colonne de plus dans le `select` principal : tant
 * que la migration 00051 n'est pas appliquee, PostgREST rejette *toute* la
 * requete avec « column does not exist ». La consultante remonterait alors
 * `null` et **chaque paiement en ligne echouerait** — le code se serait rendu
 * dependant de l'ordre entre migration et deploiement.
 *
 * Ici, une colonne absente vaut « pas proprietaire » : le comportement
 * anterieur, avec une trace explicite.
 */
export const isPlatformOwnerConsultant = async (
  supabase: Reader,
  consultantId: string,
): Promise<boolean> => {
  const { data, error } = await supabase
    .from("consultants")
    .select("is_platform_owner")
    .eq("id", consultantId)
    .maybeSingle();

  if (error) {
    console.error(
      "[isPlatformOwnerConsultant] lecture impossible — " +
        "la migration 00051 est-elle appliquee ?",
      error.message,
    );
    return false;
  }

  return data?.is_platform_owner === true;
};
