import { describe, it, expect } from "vitest";
import {
  isBillingComplete,
  missingBillingFields,
  type BillingProfile,
} from "./billing-profile";

const complete: BillingProfile = {
  billing_legal_name: "Carole HERVÉ",
  billing_address: "1 rue de l'Allaitement, 44000 Nantes",
  billing_siren: "540075819",
  billing_vat_number: "FR94540075819",
};

describe("isBillingComplete", () => {
  it("accepte un profil dont tous les champs obligatoires sont remplis", () => {
    expect(isBillingComplete(complete)).toBe(true);
  });

  it("refuse tant qu'un champ obligatoire manque", () => {
    // Une facture sans l'un de ces champs n'est pas conforme : la consultante
    // ne peut donc pas facturer, donc pas vendre en ligne.
    for (const field of [
      "billing_legal_name",
      "billing_address",
      "billing_siren",
      "billing_vat_number",
    ] as const) {
      expect(isBillingComplete({ ...complete, [field]: null })).toBe(false);
    }
  });

  it("traite une chaine vide ou blanche comme absente", () => {
    // Un champ rempli d'espaces satisferait un simple test de presence sans
    // rien apporter a la facture.
    expect(isBillingComplete({ ...complete, billing_address: "   " })).toBe(false);
    expect(isBillingComplete({ ...complete, billing_legal_name: "" })).toBe(false);
  });

  it("tolere un profil totalement vide (consultante pas encore configuree)", () => {
    expect(
      isBillingComplete({
        billing_legal_name: null,
        billing_address: null,
        billing_siren: null,
        billing_vat_number: null,
      }),
    ).toBe(false);
  });
});

describe("missingBillingFields", () => {
  it("liste precisement ce qu'il reste a saisir", () => {
    // L'ecran de facturation s'en sert pour dire quoi remplir, plutot qu'un
    // « profil incomplet » opaque.
    const missing = missingBillingFields({
      ...complete,
      billing_siren: null,
      billing_vat_number: "  ",
    });
    expect(missing).toEqual(["billing_siren", "billing_vat_number"]);
  });

  it("ne renvoie rien pour un profil complet", () => {
    expect(missingBillingFields(complete)).toEqual([]);
  });
});
