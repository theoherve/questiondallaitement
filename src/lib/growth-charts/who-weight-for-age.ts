import whoData from "./who-weight-for-age.json";

export const WHO_PERCENTILES = [3, 15, 50, 85, 97] as const;
export type WhoPercentile = (typeof WHO_PERCENTILES)[number];

type LmsRow = { ageDays: number; L: number; M: number; S: number };

// Quantiles normaux standard correspondant à chaque percentile utilisé.
export const Z_SCORES: Record<WhoPercentile, number> = {
  3: -1.8808,
  15: -1.0364,
  50: 0,
  85: 1.0364,
  97: 1.8808,
};

const findSurroundingRows = (
  rows: LmsRow[],
  ageDays: number,
): [LmsRow, LmsRow] | null => {
  if (ageDays < rows[0].ageDays || ageDays > rows[rows.length - 1].ageDays) {
    return null;
  }
  for (let i = 0; i < rows.length - 1; i++) {
    if (ageDays >= rows[i].ageDays && ageDays <= rows[i + 1].ageDays) {
      return [rows[i], rows[i + 1]];
    }
  }
  return null;
};

const interpolateLms = (a: LmsRow, b: LmsRow, ageDays: number): LmsRow => {
  if (a.ageDays === b.ageDays) return a;
  const t = (ageDays - a.ageDays) / (b.ageDays - a.ageDays);
  return {
    ageDays,
    L: a.L + (b.L - a.L) * t,
    M: a.M + (b.M - a.M) * t,
    S: a.S + (b.S - a.S) * t,
  };
};

/**
 * Formule LMS standard OMS : X_p = M * (1 + L*S*Z_p)^(1/L), ou M * exp(S*Z_p) si L = 0.
 */
const lmsToWeightKg = (lms: LmsRow, z: number): number =>
  lms.L === 0 ? lms.M * Math.exp(lms.S * z) : lms.M * Math.pow(1 + lms.L * lms.S * z, 1 / lms.L);

const zScoreFromLmsWeight = (lms: LmsRow, weightKg: number): number =>
  lms.L === 0
    ? Math.log(weightKg / lms.M) / lms.S
    : (Math.pow(weightKg / lms.M, lms.L) - 1) / (lms.L * lms.S);

export const getZScoreForWeight = (
  ageInDays: number,
  sex: "female" | "male",
  weightGrams: number,
): number | null => {
  const rows = whoData[sex] as LmsRow[];
  const surrounding = findSurroundingRows(rows, ageInDays);
  if (!surrounding) return null;

  const lms = interpolateLms(surrounding[0], surrounding[1], ageInDays);
  return zScoreFromLmsWeight(lms, weightGrams / 1000);
};

export const getPercentileBandForWeight = (
  ageInDays: number,
  sex: "female" | "male",
  weightGrams: number,
): WhoPercentile | null => {
  const z = getZScoreForWeight(ageInDays, sex, weightGrams);
  if (z === null) return null;

  let closest: WhoPercentile = WHO_PERCENTILES[0];
  let closestDiff = Infinity;
  for (const p of WHO_PERCENTILES) {
    const diff = Math.abs(Z_SCORES[p] - z);
    if (diff < closestDiff) {
      closestDiff = diff;
      closest = p;
    }
  }
  return closest;
};

export const getPercentileWeightGrams = (
  ageInDays: number,
  sex: "female" | "male",
  percentile: WhoPercentile,
): number | null => {
  const rows = whoData[sex] as LmsRow[];
  const surrounding = findSurroundingRows(rows, ageInDays);
  if (!surrounding) return null;

  const lms = interpolateLms(surrounding[0], surrounding[1], ageInDays);
  const weightKg = lmsToWeightKg(lms, Z_SCORES[percentile]);
  return Math.round(weightKg * 1000);
};
