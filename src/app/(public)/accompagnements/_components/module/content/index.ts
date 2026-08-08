import type { ModuleContent } from "./types";
import { MON_ALLAITEMENT_DES_PREMIERS_JOURS } from "./mon-allaitement-des-premiers-jours";

/**
 * Copie des pages de vente, par slug. `Partial` volontairement : un module sans
 * fichier de contenu retombe sur la fiche produit generique plutot que de
 * casser la page.
 */
export const MODULE_CONTENT: Partial<Record<string, ModuleContent>> = {
  "mon-allaitement-des-premiers-jours": MON_ALLAITEMENT_DES_PREMIERS_JOURS,
};
