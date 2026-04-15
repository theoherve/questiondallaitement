import { describe, it, expect } from "vitest";
import { computeOccurrences, describeRecurrence } from "./recurrence";
import type { RecurrenceRule } from "./types";

// ─── computeOccurrences — weekly ──────────────────────────────

describe("computeOccurrences — weekly", () => {
  it("retourne chaque semaine le jour cible entre from et until", () => {
    // 2026-01-01 is a Thursday — ask for Wednesdays (dayOfWeek=3)
    const rule: RecurrenceRule = {
      frequency: "weekly",
      interval: 1,
      day_of_week: 3, // Wednesday
    };
    const from = new Date(2026, 0, 1); // Jan 1 2026 (Thu)
    const until = new Date(2026, 0, 31); // Jan 31 2026 (Sat)

    const result = computeOccurrences(rule, from, until);

    expect(result.map((d) => d.getDate())).toEqual([7, 14, 21, 28]);
    for (const d of result) expect(d.getDay()).toBe(3);
  });

  it("respecte l'interval (toutes les 2 semaines)", () => {
    const rule: RecurrenceRule = {
      frequency: "weekly",
      interval: 2,
      day_of_week: 1, // Monday
    };
    const from = new Date(2026, 0, 1);
    const until = new Date(2026, 1, 28);

    const result = computeOccurrences(rule, from, until);

    // Jan 2026: Mondays are 5, 12, 19, 26 — with interval=2 starting at 5: 5, 19
    // Feb 2026: 2, 9, 16, 23 — continuing: 2, 16
    expect(result.map((d) => d.getDate())).toEqual([5, 19, 2, 16]);
  });

  it("retourne vide si from > until", () => {
    const rule: RecurrenceRule = {
      frequency: "weekly",
      interval: 1,
      day_of_week: 1,
    };
    const result = computeOccurrences(
      rule,
      new Date(2026, 5, 1),
      new Date(2026, 0, 1),
    );
    expect(result).toEqual([]);
  });
});

// ─── computeOccurrences — monthly ─────────────────────────────

describe("computeOccurrences — monthly", () => {
  it("retourne le 1er mercredi de chaque mois", () => {
    const rule: RecurrenceRule = {
      frequency: "monthly",
      interval: 1,
      day_of_week: 3, // Wed
      week_of_month: 1,
    };
    const from = new Date(2026, 0, 1);
    const until = new Date(2026, 2, 31); // Jan-Mar 2026

    const result = computeOccurrences(rule, from, until);

    // 1st Wed: Jan 7, Feb 4, Mar 4
    expect(
      result.map((d) => [d.getFullYear(), d.getMonth() + 1, d.getDate()]),
    ).toEqual([
      [2026, 1, 7],
      [2026, 2, 4],
      [2026, 3, 4],
    ]);
  });

  it("retourne le dernier vendredi de chaque mois (week_of_month=-1)", () => {
    const rule: RecurrenceRule = {
      frequency: "monthly",
      interval: 1,
      day_of_week: 5, // Fri
      week_of_month: -1,
    };
    const from = new Date(2026, 0, 1);
    const until = new Date(2026, 2, 31);

    const result = computeOccurrences(rule, from, until);

    // Last Fri: Jan 30, Feb 27, Mar 27 (2026)
    expect(
      result.map((d) => [d.getFullYear(), d.getMonth() + 1, d.getDate()]),
    ).toEqual([
      [2026, 1, 30],
      [2026, 2, 27],
      [2026, 3, 27],
    ]);
  });

  it("respecte l'interval tous les 2 mois", () => {
    const rule: RecurrenceRule = {
      frequency: "monthly",
      interval: 2,
      day_of_week: 2, // Tue
      week_of_month: 2,
    };
    const from = new Date(2026, 0, 1);
    const until = new Date(2026, 5, 30);

    const result = computeOccurrences(rule, from, until);

    // 2nd Tuesday every 2 months — Jan, Mar, May
    expect(result.map((d) => d.getMonth() + 1)).toEqual([1, 3, 5]);
  });

  it("ignore les occurrences antérieures à from dans le mois de départ", () => {
    const rule: RecurrenceRule = {
      frequency: "monthly",
      interval: 1,
      day_of_week: 3, // Wed
      week_of_month: 1,
    };
    // Start AFTER the 1st Wed (Jan 7) — should skip Jan, start Feb
    const from = new Date(2026, 0, 10);
    const until = new Date(2026, 2, 31);

    const result = computeOccurrences(rule, from, until);

    expect(result.map((d) => d.getMonth() + 1)).toEqual([2, 3]);
  });
});

// ─── describeRecurrence ───────────────────────────────────────

describe("describeRecurrence", () => {
  it("weekly interval=1", () => {
    expect(
      describeRecurrence({ frequency: "weekly", interval: 1, day_of_week: 3 }),
    ).toBe("Chaque mercredi");
  });

  it("weekly interval>1", () => {
    expect(
      describeRecurrence({ frequency: "weekly", interval: 2, day_of_week: 1 }),
    ).toBe("Toutes les 2 semaines, le lundi");
  });

  it("monthly Nth weekday", () => {
    expect(
      describeRecurrence({
        frequency: "monthly",
        interval: 1,
        day_of_week: 3,
        week_of_month: 1,
      }),
    ).toBe("1er mercredi du mois");
  });

  it("monthly last weekday", () => {
    expect(
      describeRecurrence({
        frequency: "monthly",
        interval: 1,
        day_of_week: 5,
        week_of_month: -1,
      }),
    ).toBe("Dernier vendredi du mois");
  });

  it("monthly Nth avec interval>1", () => {
    expect(
      describeRecurrence({
        frequency: "monthly",
        interval: 3,
        day_of_week: 2,
        week_of_month: 2,
      }),
    ).toBe("2e mardi, tous les 3 mois");
  });
});
