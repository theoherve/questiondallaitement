import type { ModuleContent } from "./types";
import { JE_ME_PREPARE_A_ALLAITER } from "./je-me-prepare-a-allaiter";
import { DE_LA_COUVEUSE_AU_SEIN } from "./de-la-couveuse-au-sein";
import { MON_ALLAITEMENT_DES_PREMIERS_JOURS } from "./mon-allaitement-des-premiers-jours";
import { MON_ALLAITEMENT_AU_FIL_DES_MOIS } from "./mon-allaitement-au-fil-des-mois";
import { JE_REPRENDS_UNE_ACTIVITE_PROFESSIONNELLE } from "./je-reprends-une-activite-professionnelle";
import { LA_DIVERSIFICATION_DE_MON_BEBE_ALLAITE } from "./la-diversification-de-mon-bebe-allaite";
import { JE_SOUHAITE_SEVRER_MON_BEBE } from "./je-souhaite-sevrer-mon-bebe";
import { MON_BEBE_NE_FAIT_PAS_SES_NUITS } from "./mon-bebe-ne-fait-pas-ses-nuits";
import { LES_URGENCES_DE_L_ALLAITEMENT } from "./les-urgences-de-l-allaitement";

/**
 * Copie des pages de vente, par slug. `Partial` volontairement : un module sans
 * fichier de contenu retombe sur la fiche produit generique plutot que de
 * casser la page.
 *
 * L'ordre suit MODULE_ORDER (chronologie de l'allaitement).
 */
export const MODULE_CONTENT: Partial<Record<string, ModuleContent>> = {
  "je-me-prepare-a-allaiter": JE_ME_PREPARE_A_ALLAITER,
  "de-la-couveuse-au-sein": DE_LA_COUVEUSE_AU_SEIN,
  "mon-allaitement-des-premiers-jours": MON_ALLAITEMENT_DES_PREMIERS_JOURS,
  "mon-allaitement-au-fil-des-mois": MON_ALLAITEMENT_AU_FIL_DES_MOIS,
  "je-reprends-une-activite-professionnelle":
    JE_REPRENDS_UNE_ACTIVITE_PROFESSIONNELLE,
  "la-diversification-de-mon-bebe-allaite":
    LA_DIVERSIFICATION_DE_MON_BEBE_ALLAITE,
  "je-souhaite-sevrer-mon-bebe": JE_SOUHAITE_SEVRER_MON_BEBE,
  "mon-bebe-ne-fait-pas-ses-nuits": MON_BEBE_NE_FAIT_PAS_SES_NUITS,
  "les-urgences-de-l-allaitement": LES_URGENCES_DE_L_ALLAITEMENT,
};
