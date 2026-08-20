export const getCorrectedAgeInDays = (
  child: { is_premature: boolean; gestational_age_weeks: number | null },
  ageInDaysReal: number,
): number => {
  if (!child.is_premature || child.gestational_age_weeks == null) {
    return ageInDaysReal;
  }
  const correctionDays = Math.max(0, (40 - child.gestational_age_weeks) * 7);
  return Math.max(0, ageInDaysReal - correctionDays);
};
