import { describe, expect, it } from "vitest";
import { newsletterSignupSchema } from "./newsletter";

const valid = {
  first_name: "Margaux",
  email: "margaux@example.com",
  consent: true as const,
  source: "page_newsletter" as const,
};

describe("newsletterSignupSchema", () => {
  it("accepte une inscription complète", () => {
    expect(newsletterSignupSchema.safeParse(valid).success).toBe(true);
  });

  it("refuse un consentement absent ou décoché", () => {
    // La case doit etre cochee, jamais pre-cochee : c'est la base legale du
    // traitement. `false` doit echouer aussi surement que l'absence de champ.
    for (const consent of [false, undefined]) {
      const result = newsletterSignupSchema.safeParse({ ...valid, consent });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.consent?.[0]).toBe(
          "Merci de cocher la case pour continuer",
        );
      }
    }
  });

  it("refuse un email mal formé avec le message attendu", () => {
    const result = newsletterSignupSchema.safeParse({
      ...valid,
      email: "margaux@",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.email?.[0]).toBe(
        "Merci d'indiquer un email valide",
      );
    }
  });

  it("refuse un prénom vide ou fait uniquement d'espaces", () => {
    for (const first_name of ["", "   "]) {
      const result = newsletterSignupSchema.safeParse({ ...valid, first_name });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.first_name?.[0]).toBe(
          "Merci d'indiquer votre prénom",
        );
      }
    }
  });

  it("refuse une source inconnue", () => {
    // Cette valeur part telle quelle dans l'attribut SOURCE de Brevo et dans la
    // table d'evenements : accepter n'importe quelle chaine polluerait la
    // comparaison entre points d'entree.
    expect(
      newsletterSignupSchema.safeParse({ ...valid, source: "facebook" }).success,
    ).toBe(false);
  });

  it("laisse passer le honeypot rempli — le tri se fait côté serveur", () => {
    // Le schema ne doit pas rejeter : la route repond 200 sans rien traiter,
    // pour qu'un robot ne sache pas quel champ l'a trahi.
    expect(
      newsletterSignupSchema.safeParse({ ...valid, website: "http://spam.example" })
        .success,
    ).toBe(true);
  });
});
