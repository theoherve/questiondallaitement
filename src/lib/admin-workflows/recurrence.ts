import type { RecurrenceRule } from "./types";

/**
 * Compute all occurrence dates matching a recurrence rule between `from` and `until`.
 * Pure function — no side effects.
 */
export const computeOccurrences = (
  rule: RecurrenceRule,
  from: Date,
  until: Date,
): Date[] => {
  if (rule.frequency === "monthly") {
    return computeMonthlyOccurrences(rule, from, until);
  }
  return computeWeeklyOccurrences(rule, from, until);
};

/**
 * Monthly recurrence.
 * Supports: "Nth day_of_week of month" (e.g., 1st Wednesday).
 * week_of_month: 1=first, 2=second, ..., -1=last.
 */
const computeMonthlyOccurrences = (
  rule: RecurrenceRule,
  from: Date,
  until: Date,
): Date[] => {
  const results: Date[] = [];
  const interval = rule.interval ?? 1;
  const dayOfWeek = rule.day_of_week ?? 0;
  const weekOfMonth = rule.week_of_month ?? 1;

  // Start from the month of `from`
  let year = from.getFullYear();
  let month = from.getMonth();

  while (true) {
    const candidate = getNthWeekdayOfMonth(year, month, dayOfWeek, weekOfMonth);

    if (candidate > until) break;

    if (candidate >= from) {
      results.push(candidate);
    }

    // Advance by interval months
    month += interval;
    if (month > 11) {
      year += Math.floor(month / 12);
      month = month % 12;
    }
  }

  return results;
};

/**
 * Weekly recurrence.
 * Matches a specific day_of_week every N weeks.
 */
const computeWeeklyOccurrences = (
  rule: RecurrenceRule,
  from: Date,
  until: Date,
): Date[] => {
  const results: Date[] = [];
  const interval = rule.interval ?? 1;
  const dayOfWeek = rule.day_of_week ?? 0;

  // Find first matching day >= from
  const cursor = new Date(from);
  const currentDay = cursor.getDay();
  let daysToAdd = dayOfWeek - currentDay;
  if (daysToAdd < 0) daysToAdd += 7;
  cursor.setDate(cursor.getDate() + daysToAdd);

  while (cursor <= until) {
    results.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 7 * interval);
  }

  return results;
};

/**
 * Get the Nth occurrence of a weekday in a given month.
 * week_of_month: 1-5 (from start) or -1 (last occurrence).
 */
const getNthWeekdayOfMonth = (
  year: number,
  month: number,
  dayOfWeek: number,
  weekOfMonth: number,
): Date => {
  if (weekOfMonth === -1) {
    return getLastWeekdayOfMonth(year, month, dayOfWeek);
  }

  // Find first occurrence of dayOfWeek in this month
  const firstOfMonth = new Date(year, month, 1);
  const firstDow = firstOfMonth.getDay();
  let daysToAdd = dayOfWeek - firstDow;
  if (daysToAdd < 0) daysToAdd += 7;

  // First occurrence is on day (1 + daysToAdd)
  // Nth occurrence is (weekOfMonth - 1) weeks later
  const day = 1 + daysToAdd + (weekOfMonth - 1) * 7;

  return new Date(year, month, day);
};

/**
 * Get the last occurrence of a weekday in a given month.
 */
const getLastWeekdayOfMonth = (
  year: number,
  month: number,
  dayOfWeek: number,
): Date => {
  // Last day of month
  const lastDay = new Date(year, month + 1, 0);
  const lastDow = lastDay.getDay();
  let daysToSubtract = lastDow - dayOfWeek;
  if (daysToSubtract < 0) daysToSubtract += 7;

  return new Date(year, month, lastDay.getDate() - daysToSubtract);
};

/**
 * Generate a human-readable description for a recurrence rule.
 */
export const describeRecurrence = (rule: RecurrenceRule): string => {
  const days = [
    "dimanche",
    "lundi",
    "mardi",
    "mercredi",
    "jeudi",
    "vendredi",
    "samedi",
  ];
  const ordinals = ["", "1er", "2e", "3e", "4e", "5e"];
  const day = days[rule.day_of_week ?? 0];

  if (rule.frequency === "weekly") {
    if ((rule.interval ?? 1) === 1) return `Chaque ${day}`;
    return `Toutes les ${rule.interval} semaines, le ${day}`;
  }

  const weekLabel =
    rule.week_of_month === -1
      ? "Dernier"
      : ordinals[rule.week_of_month ?? 1];

  if ((rule.interval ?? 1) === 1) return `${weekLabel} ${day} du mois`;
  return `${weekLabel} ${day}, tous les ${rule.interval} mois`;
};
