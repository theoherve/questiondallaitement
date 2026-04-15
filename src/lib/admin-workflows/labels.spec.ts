import { describe, it, expect } from "vitest";
import { computeScheduledFor } from "./labels";

// ─── computeScheduledFor ──────────────────────────────────────
// Tests target the pure timezone/offset logic. `resolveAudience` is covered
// separately (requires Supabase mock).

describe("computeScheduledFor — DST Europe/Paris", () => {
  it("hiver (CET = UTC+1) : Paris 09:00 → 08:00 UTC", () => {
    const iso = computeScheduledFor("2026-01-15", 0, "09:00");
    expect(iso).toBe("2026-01-15T08:00:00.000Z");
  });

  it("été (CEST = UTC+2) : Paris 09:00 → 07:00 UTC", () => {
    const iso = computeScheduledFor("2026-07-15", 0, "09:00");
    expect(iso).toBe("2026-07-15T07:00:00.000Z");
  });

  it("juste après bascule printemps (fin mars) : CEST actif", () => {
    // Paris DST starts last Sunday of March 2026 = March 29.
    const iso = computeScheduledFor("2026-03-30", 0, "09:00");
    expect(iso).toBe("2026-03-30T07:00:00.000Z");
  });

  it("juste après bascule automne (fin octobre) : CET actif", () => {
    // Paris DST ends last Sunday of October 2026 = October 25.
    const iso = computeScheduledFor("2026-10-26", 0, "09:00");
    expect(iso).toBe("2026-10-26T08:00:00.000Z");
  });
});

describe("computeScheduledFor — delay_days", () => {
  it("delay négatif : reporte en arrière", () => {
    // J-7 avant 2026-01-15 → 2026-01-08
    const iso = computeScheduledFor("2026-01-15", -7, "09:00");
    expect(iso.slice(0, 10)).toBe("2026-01-08");
  });

  it("delay positif : reporte en avant", () => {
    const iso = computeScheduledFor("2026-01-15", 3, "09:00");
    expect(iso.slice(0, 10)).toBe("2026-01-18");
  });

  it("delay = 0 : garde la date d'origine", () => {
    const iso = computeScheduledFor("2026-01-15", 0, "09:00");
    expect(iso.slice(0, 10)).toBe("2026-01-15");
  });

  it("delay traversant une bascule DST", () => {
    // +5 jours depuis 2026-03-25 (CET) → 2026-03-30 (CEST)
    // Paris 09:00 le 30 mars devient 07:00 UTC.
    const iso = computeScheduledFor("2026-03-25", 5, "09:00");
    expect(iso).toBe("2026-03-30T07:00:00.000Z");
  });
});

describe("computeScheduledFor — formats de temps", () => {
  it("14:30 (minutes non nulles)", () => {
    const iso = computeScheduledFor("2026-01-15", 0, "14:30");
    expect(iso).toBe("2026-01-15T13:30:00.000Z");
  });

  it("00:00 (minuit)", () => {
    const iso = computeScheduledFor("2026-01-15", 0, "00:00");
    expect(iso).toBe("2026-01-14T23:00:00.000Z");
  });

  it("23:59", () => {
    const iso = computeScheduledFor("2026-07-15", 0, "23:59");
    // 23:59 Paris été → 21:59 UTC
    expect(iso).toBe("2026-07-15T21:59:00.000Z");
  });

  it("tolère le format HH:MM:SS (Postgres TIME)", () => {
    // split(":") → ["09","00","00"], destructure [hours,minutes]=[9,0] OK
    const iso = computeScheduledFor("2026-01-15", 0, "09:00:00");
    expect(iso).toBe("2026-01-15T08:00:00.000Z");
  });
});
