import { describe, it, expect } from "vitest";
import {
  bookingRequiresWaiver,
  WITHDRAWAL_TEXTS,
  WITHDRAWAL_TEXT_VERSION,
} from "./withdrawal";

const at = (iso: string) => new Date(iso);

describe("bookingRequiresWaiver", () => {
  const now = at("2026-07-21T10:00:00.000Z");

  it("exige la renonciation pour une consultation sous quatorze jours", () => {
    // La prestation sera executee avant l'expiration du delai : sans demande
    // expresse, la cliente conserve son droit et peut se retracter apres coup.
    expect(bookingRequiresWaiver(at("2026-07-25T10:00:00.000Z"), now)).toBe(true);
  });

  it("n'exige rien au-dela de quatorze jours", () => {
    // Le delai sera ecoule avant la consultation : le droit s'eteint tout seul.
    expect(bookingRequiresWaiver(at("2026-08-10T10:00:00.000Z"), now)).toBe(false);
  });

  it("exige la renonciation le dernier jour du delai", () => {
    // Quatorze jours moins une heure : encore dans le delai.
    expect(bookingRequiresWaiver(at("2026-08-04T09:00:00.000Z"), now)).toBe(true);
  });

  it("n'exige rien juste apres l'expiration", () => {
    expect(bookingRequiresWaiver(at("2026-08-04T11:00:00.000Z"), now)).toBe(false);
  });

  it("exige la renonciation pour une consultation deja passee", () => {
    // Cas limite defensif : une date passee est a fortiori dans le delai.
    expect(bookingRequiresWaiver(at("2026-07-20T10:00:00.000Z"), now)).toBe(true);
  });
});

describe("textes de renonciation", () => {
  it("porte une version, pour pouvoir prouver ce qui a ete accepte", () => {
    // En cas de litige, il faut pouvoir dire *quel* texte la cliente a lu.
    // Sans version, une reformulation ulterieure rendrait la trace inutile.
    expect(WITHDRAWAL_TEXT_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("couvre les deux cas prevus par le code de la consommation", () => {
    expect(Object.keys(WITHDRAWAL_TEXTS).sort()).toEqual([
      "booking",
      "formation",
    ]);
  });

  it("demande expressement l'execution anticipee pour une consultation", () => {
    // L221-25 : la demande doit etre expresse, et la perte du droit reconnue.
    expect(WITHDRAWAL_TEXTS.booking).toMatch(/demande express/i);
    expect(WITHDRAWAL_TEXTS.booking).toMatch(/quatorze jours/i);
  });

  it("recueille consentement et renonciation pour un contenu immediat", () => {
    // L221-28 13° : acces immediat, donc consentement prealable *et*
    // renonciation explicite.
    expect(WITHDRAWAL_TEXTS.formation).toMatch(/imm(é|e)diatement/i);
    expect(WITHDRAWAL_TEXTS.formation).toMatch(/renonce/i);
  });
});
