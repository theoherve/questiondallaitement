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
  it("no_regain_j14 utilise l'âge RÉEL (pas l'âge corrigé) même chez un grand prématuré", () => {
    // gestational_age_weeks: 28 => correction de (40-28)*7 = 84 jours.
    // À J15 réel (2026-01-16), l'âge corrigé serait max(0, 15-84) = 0 :
    // si la règle utilisait par erreur l'âge corrigé, la condition
    // « age >= 14 » ne serait jamais vraie ici et la règle ne se
    // déclencherait pas. Avec l'âge réel (correct), elle doit se déclencher.
    const greatPremature = {
      ...baseChild,
      is_premature: true,
      gestational_age_weeks: 28,
    };
    const alerts = computeWeightAlerts(greatPremature, [
      m("m1", "2026-01-16", 3100), // J15 réel, poids de naissance non retrouvé
    ]);
    expect(alerts.map((a) => a.rule)).toContain("no_regain_j14");
  });

  it("curve_break utilise l'âge CORRIGÉ : le verdict bascule selon l'âge utilisé", () => {
    // gestational_age_weeks: 32 => correction de (40-32)*7 = 56 jours.
    // Mesures à J60/J120 réels, poids 4600g puis 4900g (fille) :
    //  - avec l'âge RÉEL (60j/120j) : bandes P15 puis P3 => écart de 1
    //    couloir seulement => pas de cassure.
    //  - avec l'âge CORRIGÉ (4j/64j) : bandes P97 puis P50 => écart de
    //    2 couloirs => cassure détectée.
    // Si l'implémentation utilisait l'âge réel au lieu de l'âge corrigé,
    // ce test ne détecterait aucune cassure et échouerait.
    const premature = {
      ...baseChild,
      is_premature: true,
      gestational_age_weeks: 32,
    };
    const alerts = computeWeightAlerts(premature, [
      m("m1", "2026-03-02", 4600), // J60 réel / J4 corrigé
      m("m2", "2026-05-01", 4900), // J120 réel / J64 corrigé
    ]);
    expect(alerts.map((a) => a.rule)).toContain("curve_break");
  });
});

describe("computeWeightAlerts — limite d'âge J13/J14 (loss_vigilance / no_regain_j14)", () => {
  it("à J13 exactement (-7%) : loss_vigilance se déclenche, no_regain_j14 non", () => {
    const alerts = computeWeightAlerts(baseChild, [
      m("m1", "2026-01-14", Math.round(3200 * 0.93)), // J13, -7% exact
    ]);
    const rules = alerts.map((a) => a.rule);
    expect(rules).toContain("loss_vigilance");
    expect(rules).not.toContain("no_regain_j14");
  });

  it("à J14 exactement (-7%) : loss_vigilance ne se déclenche plus, no_regain_j14 oui", () => {
    const alerts = computeWeightAlerts(baseChild, [
      m("m1", "2026-01-15", Math.round(3200 * 0.93)), // J14, -7% exact
    ]);
    const rules = alerts.map((a) => a.rule);
    expect(rules).not.toContain("loss_vigilance");
    expect(rules).toContain("no_regain_j14");
  });
});

describe("computeWeightAlerts — limite de perte à 10% (loss_alert)", () => {
  it("déclenche loss_alert à exactement -10%", () => {
    const alerts = computeWeightAlerts(baseChild, [
      m("m1", "2026-01-31", Math.round(3200 * 0.9)), // -10% exact
    ]);
    expect(alerts.map((a) => a.rule)).toContain("loss_alert");
  });

  it("ne déclenche pas loss_alert à -9% (juste sous le seuil)", () => {
    const alerts = computeWeightAlerts(baseChild, [
      m("m1", "2026-01-31", Math.round(3200 * 0.91)), // -9%
    ]);
    expect(alerts.map((a) => a.rule)).not.toContain("loss_alert");
  });
});

describe("computeWeightAlerts — limite de stagnation à 15g/jour", () => {
  it("ne déclenche pas stagnation à exactement 15g/jour", () => {
    const alerts = computeWeightAlerts(baseChild, [
      m("m1", "2026-01-21", 5000), // J20
      m("m2", "2026-01-31", 5150), // J30 (intermédiaire)
      m("m3", "2026-02-10", 5300), // J40 : +300g sur 20j = 15g/j exact
    ]);
    expect(alerts.map((a) => a.rule)).not.toContain("stagnation");
  });

  it("déclenche stagnation à 14g/jour (juste sous le seuil)", () => {
    const alerts = computeWeightAlerts(baseChild, [
      m("m1", "2026-01-21", 5000), // J20
      m("m2", "2026-01-31", 5140), // J30 (intermédiaire)
      m("m3", "2026-02-10", 5280), // J40 : +280g sur 20j = 14g/j
    ]);
    expect(alerts.map((a) => a.rule)).toContain("stagnation");
  });

  it("ne déclenche pas stagnation à 16g/jour (juste au-dessus du seuil)", () => {
    const alerts = computeWeightAlerts(baseChild, [
      m("m1", "2026-01-21", 5000), // J20
      m("m2", "2026-01-31", 5160), // J30 (intermédiaire)
      m("m3", "2026-02-10", 5320), // J40 : +320g sur 20j = 16g/j
    ]);
    expect(alerts.map((a) => a.rule)).not.toContain("stagnation");
  });
});

describe("computeWeightAlerts — porte d'entrée stagnation : âge corrigé 14 vs 15 jours", () => {
  it("âge corrigé exactement 14 jours à la première mesure : la porte bloque, pas de stagnation même à faible gain", () => {
    // gestational_age_weeks: 36 => correction de (40-36)*7 = 28 jours.
    // Première mesure à J42 réel => âge corrigé 14 (porte <= 14 => bloque),
    // malgré un gain très faible (5g/j) qui déclencherait la règle si la
    // porte laissait passer.
    const premature = {
      ...baseChild,
      is_premature: true,
      gestational_age_weeks: 36,
    };
    const alerts = computeWeightAlerts(premature, [
      m("m1", "2026-02-12", 4500), // J42 réel / J14 corrigé
      m("m2", "2026-02-22", 4550), // J52 réel / J24 corrigé (intermédiaire)
      m("m3", "2026-03-04", 4600), // J62 réel / J34 corrigé : +100g sur 20j = 5g/j
    ]);
    expect(alerts.map((a) => a.rule)).not.toContain("stagnation");
  });

  it("âge corrigé exactement 15 jours à la première mesure : la porte laisse passer, stagnation détectée à faible gain", () => {
    // Même correction (28j), première mesure décalée d'1 jour réel =>
    // âge corrigé 15 (porte > 14 => laisse passer), même gain faible (5g/j).
    const premature = {
      ...baseChild,
      is_premature: true,
      gestational_age_weeks: 36,
    };
    const alerts = computeWeightAlerts(premature, [
      m("m1", "2026-02-13", 4500), // J43 réel / J15 corrigé
      m("m2", "2026-02-23", 4550), // J53 réel / J25 corrigé (intermédiaire)
      m("m3", "2026-03-05", 4600), // J63 réel / J35 corrigé : +100g sur 20j = 5g/j
    ]);
    expect(alerts.map((a) => a.rule)).toContain("stagnation");
  });
});
