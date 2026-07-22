"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Impression / export PDF : la fenetre d'impression du navigateur permet
 * « Enregistrer au format PDF ». Le document HTML fait foi ; pas de dependance
 * de generation cote serveur.
 */
export const PrintButton = () => (
  <Button
    onClick={() => window.print()}
    className="bg-primary-green hover:bg-primary-green/90 print:hidden"
  >
    <Printer className="mr-2 h-4 w-4" />
    Imprimer / Télécharger en PDF
  </Button>
);
