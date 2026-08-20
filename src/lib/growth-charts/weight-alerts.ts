import { differenceInDays } from "date-fns";
import { getPercentileBandForWeight, WHO_PERCENTILES } from "./who-weight-for-age";
import { getCorrectedAgeInDays } from "./corrected-age";

export type WeightAlertRule =
  | "loss_vigilance"
  | "loss_alert"
  | "no_regain_j14"
  | "curve_break"
  | "stagnation";

export type WeightAlertLevel = "vigilance" | "alerte";

export type WeightAlert = {
  rule: WeightAlertRule;
  level: WeightAlertLevel;
  message: string;
  measurementId: string;
};

export type WeightAlertChild = {
  birth_date: string;
  sex: "female" | "male";
  is_premature: boolean;
  gestational_age_weeks: number | null;
  birth_weight_grams: number | null;
};

export type WeightAlertMeasurement = {
  id: string;
  measured_at: string;
  weight_grams: number;
};

export const WEIGHT_ALERT_MESSAGES: Record<WeightAlertRule, string> = {
  loss_vigilance:
    "Perte de poids à surveiller de près (≥7 % du poids de naissance) — renforcer l'observation des tétées.",
  loss_alert:
    "Perte de poids importante (≥10 %) — orientation médicale recommandée sans délai.",
  no_regain_j14:
    "Le poids de naissance n'est pas encore retrouvé à J14 — à investiguer.",
  curve_break:
    "Cassure de courbe détectée — changement de couloir de croissance à investiguer.",
  stagnation: "Prise de poids ralentie sur les dernières mesures — à surveiller.",
};

const asUtcDate = (isoDate: string) => new Date(`${isoDate}T00:00:00.000Z`);

const alert = (
  rule: WeightAlertRule,
  level: WeightAlertLevel,
  measurementId: string,
): WeightAlert => ({ rule, level, message: WEIGHT_ALERT_MESSAGES[rule], measurementId });

export const computeWeightAlerts = (
  child: WeightAlertChild,
  measurements: WeightAlertMeasurement[],
): WeightAlert[] => {
  const sorted = [...measurements].sort((a, b) =>
    a.measured_at.localeCompare(b.measured_at),
  );
  const birthDate = asUtcDate(child.birth_date);
  const ageInDaysReal = (m: WeightAlertMeasurement) =>
    differenceInDays(asUtcDate(m.measured_at), birthDate);

  const alerts: WeightAlert[] = [];

  if (child.birth_weight_grams != null) {
    const birthWeight = child.birth_weight_grams;
    const hasEverRegainedByJ14 = sorted.some(
      (m) => ageInDaysReal(m) >= 14 && m.weight_grams >= birthWeight,
    );
    for (const m of sorted) {
      const age = ageInDaysReal(m);
      const lossRatio = (birthWeight - m.weight_grams) / birthWeight;

      if (age <= 13 && lossRatio >= 0.07) {
        alerts.push(alert("loss_vigilance", "vigilance", m.id));
      }
      if (lossRatio >= 0.1) {
        alerts.push(alert("loss_alert", "alerte", m.id));
      }
      if (!hasEverRegainedByJ14 && age >= 14 && m.weight_grams < birthWeight) {
        alerts.push(alert("no_regain_j14", "vigilance", m.id));
      }
    }
  }

  for (let i = 1; i < sorted.length; i++) {
    const prevAge = getCorrectedAgeInDays(child, ageInDaysReal(sorted[i - 1]));
    const currAge = getCorrectedAgeInDays(child, ageInDaysReal(sorted[i]));
    const prevBand = getPercentileBandForWeight(prevAge, child.sex, sorted[i - 1].weight_grams);
    const currBand = getPercentileBandForWeight(currAge, child.sex, sorted[i].weight_grams);
    if (prevBand !== null && currBand !== null) {
      const prevIndex = WHO_PERCENTILES.indexOf(prevBand);
      const currIndex = WHO_PERCENTILES.indexOf(currBand);
      const drop = prevIndex - currIndex;
      if (drop >= 2) {
        alerts.push(alert("curve_break", "alerte", sorted[i].id));
      }
    }
  }

  for (let i = 2; i < sorted.length; i++) {
    const first = sorted[i - 2];
    const last = sorted[i];
    const firstAgeCorrected = getCorrectedAgeInDays(child, ageInDaysReal(first));
    if (firstAgeCorrected <= 14) continue;

    const days = differenceInDays(asUtcDate(last.measured_at), asUtcDate(first.measured_at));
    if (days <= 0) continue;

    const avgGainPerDay = (last.weight_grams - first.weight_grams) / days;
    if (avgGainPerDay < 15) {
      alerts.push(alert("stagnation", "vigilance", last.id));
    }
  }

  return alerts;
};
