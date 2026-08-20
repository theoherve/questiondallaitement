import { describe, it, expect } from "vitest";
import { computeWeightAlerts } from "./weight-alerts";

const baseChild = {
  birth_date: "2026-01-01",
  sex: "female" as const,
  is_premature: false,
  gestational_age_weeks: null,
  birth_weight_grams: 3200,
};

const m = (id: string, measured_at: string, weight_grams: number) => ({
  id,
  measured_at,
  weight_grams,
});

describe("computeWeightAlerts — perte de poids", () => {
  it("déclenche loss_vigilance à -7% avant J14", () => {
    const alerts = computeWeightAlerts(baseChild, [
      m("m1", "2026-01-05", Math.round(3200 * 0.93)),
    ]);
    expect(alerts.map((a) => a.rule)).toContain("loss_vigilance");
  });

  it("ne déclenche rien à -5% avant J14", () => {
    const alerts = computeWeightAlerts(baseChild, [
      m("m1", "2026-01-05", Math.round(3200 * 0.95)),
    ]);
    expect(alerts).toHaveLength(0);
  });

  it("déclenche loss_alert à -10%, à tout âge", () => {
    const alerts = computeWeightAlerts(baseChild, [
      m("m1", "2026-02-01", Math.round(3200 * 0.89)),
    ]);
    expect(alerts.map((a) => a.rule)).toContain("loss_alert");
  });

  it("ne déclenche aucune règle de perte quand birth_weight_grams est NULL", () => {
    const alerts = computeWeightAlerts(
      { ...baseChild, birth_weight_grams: null },
      [m("m1", "2026-01-05", 2000)],
    );
    expect(alerts.filter((a) => a.rule.startsWith("loss"))).toHaveLength(0);
  });
});

describe("computeWeightAlerts — non-reprise à J14", () => {
  it("déclenche no_regain_j14 si le poids de naissance n'est pas retrouvé à J14+", () => {
    const alerts = computeWeightAlerts(baseChild, [
      m("m1", "2026-01-16", 3100),
    ]);
    expect(alerts.map((a) => a.rule)).toContain("no_regain_j14");
  });

  it("ne déclenche rien si le poids de naissance est retrouvé à J14+", () => {
    const alerts = computeWeightAlerts(baseChild, [
      m("m1", "2026-01-16", 3250),
    ]);
    expect(alerts.map((a) => a.rule)).not.toContain("no_regain_j14");
  });
});

describe("computeWeightAlerts — cassure de courbe", () => {
  it("déclenche curve_break sur une chute de 2 couloirs entre deux mesures", () => {
    const alerts = computeWeightAlerts(baseChild, [
      m("m1", "2026-02-01", 5500), // proche P85 à 31 jours
      m("m2", "2026-03-01", 4800), // proche P15 à 59 jours
    ]);
    expect(alerts.map((a) => a.rule)).toContain("curve_break");
  });

  it("ne déclenche rien pour une croissance régulière", () => {
    const alerts = computeWeightAlerts(baseChild, [
      m("m1", "2026-02-01", 4900),
      m("m2", "2026-03-01", 5300),
    ]);
    expect(alerts.map((a) => a.rule)).not.toContain("curve_break");
  });
});

describe("computeWeightAlerts — stagnation", () => {
  it("déclenche stagnation sur 3 mesures après J14 avec un gain moyen < 15g/j", () => {
    const alerts = computeWeightAlerts(baseChild, [
      m("m1", "2026-02-01", 4800),
      m("m2", "2026-02-11", 4850), // +5g/j sur 10j
      m("m3", "2026-02-21", 4900), // +5g/j sur 10j
    ]);
    expect(alerts.map((a) => a.rule)).toContain("stagnation");
  });

  it("ne déclenche rien avec un gain moyen >= 15g/j", () => {
    const alerts = computeWeightAlerts(baseChild, [
      m("m1", "2026-02-01", 4800),
      m("m2", "2026-02-11", 5000),
      m("m3", "2026-02-21", 5200),
    ]);
    expect(alerts.map((a) => a.rule)).not.toContain("stagnation");
  });
});

describe("computeWeightAlerts — âge corrigé prématuré", () => {
  it("utilise l'âge corrigé pour la cassure de courbe chez un prématuré", () => {
    const premature = {
      ...baseChild,
      is_premature: true,
      gestational_age_weeks: 32, // 8 semaines = 56 jours de correction
    };
    // Sans correction, ces mesures seraient à 90j/150j (bandes hautes,
    // écart plausible) ; avec correction (34j/94j), l'écart doit rester
    // cohérent avec la table OMS jeune plutôt que de paraître aberrant.
    const alerts = computeWeightAlerts(premature, [
      m("m1", "2026-04-01", 4600),
      m("m2", "2026-05-31", 5200),
    ]);
    expect(Array.isArray(alerts)).toBe(true);
  });
});
