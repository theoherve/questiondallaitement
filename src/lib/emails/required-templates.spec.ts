import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  REQUIRED_TEMPLATES,
  isRequiredTemplate,
  requiredTemplateReason,
} from "./required-templates";

/**
 * Un garde-fou ne vaut que s'il ne peut pas se desynchroniser en silence.
 * Ces tests verifient les deux sens : ce que le code lit doit etre protege,
 * et ce qui est protege doit avoir une raison lisible.
 */

const SEND_SOURCE = readFileSync(resolve(__dirname, "send.ts"), "utf8");

/** Noms passes litteralement a getTemplate() dans send.ts. */
const templatesReadByCode = (source: string): string[] => [
  ...new Set(
    [...source.matchAll(/getTemplate\(\s*"([a-z_]+)"\s*\)/g)].map((m) => m[1]),
  ),
];

/**
 * Un template est obligatoire quand son absence empeche l'envoi.
 *
 * Deux formes coexistent dans send.ts :
 *   `if (!template) return;`   -> rien ne part, le template est obligatoire
 *   `if (template) { ... }`    -> un repli en dur prend le relais, optionnel
 *
 * On lit la forme employee plutot que de tenir une liste d'exceptions : si un
 * envoi perdait son repli, il basculerait automatiquement dans les obligatoires
 * et le test exigerait sa protection.
 */
const isMandatoryUsage = (source: string, name: string): boolean => {
  const at = source.indexOf(`getTemplate("${name}")`);
  if (at === -1) return false;
  const after = source.slice(at, at + 200);
  if (/if\s*\(\s*!template\s*\)\s*return/.test(after)) return true;
  if (/if\s*\(\s*template\s*\)\s*\{/.test(after)) return false;
  // Forme inconnue : on considere obligatoire plutot que de laisser passer.
  return true;
};

describe("templates requis", () => {
  it("detecte les getTemplate() du source", () => {
    // Sans ce controle, une regex cassee ferait passer le test suivant a vide.
    const found = templatesReadByCode(SEND_SOURCE);
    expect(found.length).toBeGreaterThan(3);
    expect(found).toContain("booking_confirmation");
  });

  it("distingue les envois a repli des envois sans filet", () => {
    // Controle du detecteur lui-meme : sans lui, une regex cassee classerait
    // tout en optionnel et le test suivant passerait a vide.
    expect(isMandatoryUsage(SEND_SOURCE, "booking_confirmation")).toBe(true);
    expect(isMandatoryUsage(SEND_SOURCE, "new_booking_notification")).toBe(false);
  });

  it("protege tout template dont l'absence empeche l'envoi", () => {
    const unprotected = templatesReadByCode(SEND_SOURCE)
      .filter((name) => isMandatoryUsage(SEND_SOURCE, name))
      .filter((name) => !isRequiredTemplate(name));

    expect(
      unprotected,
      `Ces templates sont lus sans repli par send.ts mais peuvent etre ` +
        `supprimes depuis l'admin : ${unprotected.join(", ")}. ` +
        `Les ajouter a REQUIRED_TEMPLATES.`,
    ).toEqual([]);
  });

  it("donne une raison lisible pour chaque template protege", () => {
    const vague = REQUIRED_TEMPLATES.filter(
      (name) => requiredTemplateReason(name) === "un email transactionnel",
    );
    expect(
      vague,
      `Message de refus generique pour : ${vague.join(", ")}. ` +
        `Nommer ce que la suppression casserait.`,
    ).toEqual([]);
  });

  it("ne protege pas un template inconnu", () => {
    expect(isRequiredTemplate("campagne_de_noel")).toBe(false);
  });
});
