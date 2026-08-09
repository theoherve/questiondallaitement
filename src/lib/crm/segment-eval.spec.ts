import { describe, it, expect } from "vitest";
import { matchesConditions } from "./segment-eval";
import type { SegmentClientStats } from "./segment-eval";
import type { SegmentCondition } from "@/types/database";

const client = (over: Partial<SegmentClientStats> = {}): SegmentClientStats => ({
  id: "c1",
  first_name: "Camille",
  last_name: "D",
  email: "a@b.fr",
  booking_count: 2,
  total_spent_cents: 9000,
  accompagnement_count: 1,
  formation_count: 0,
  inactive_days: 10,
  days_since_registration: 90,
  score: 50,
  tag_ids: ["tag-instagram"],
  has_accompagnement: true,
  ...over,
});

describe("matchesConditions", () => {
  it("accepte une liste de conditions vide", () => {
    expect(matchesConditions(client(), [])).toBe(true);
  });

  it("applique les opérateurs numériques", () => {
    const cond = (op: string, value: number) =>
      [{ field: "booking_count", op, value }] as SegmentCondition[];
    expect(matchesConditions(client(), cond(">=", 2))).toBe(true);
    expect(matchesConditions(client(), cond(">=", 3))).toBe(false);
    expect(matchesConditions(client(), cond("<=", 2))).toBe(true);
    expect(matchesConditions(client(), cond("=", 2))).toBe(true);
    expect(matchesConditions(client(), cond("!=", 2))).toBe(false);
  });

  it("combine les conditions par ET", () => {
    expect(
      matchesConditions(client(), [
        { field: "booking_count", op: ">=", value: 2 },
        { field: "total_spent_cents", op: ">=", value: 10000 },
      ] as SegmentCondition[])
    ).toBe(false);
  });

  it("reconnaît un tag posé sur la cliente", () => {
    expect(
      matchesConditions(client(), [
        { field: "has_tag", op: "=", value: "tag-instagram" },
      ] as SegmentCondition[])
    ).toBe(true);
  });

  it("rejette un tag absent", () => {
    expect(
      matchesConditions(client(), [
        { field: "has_tag", op: "=", value: "tag-salon" },
      ] as SegmentCondition[])
    ).toBe(false);
  });

  it("sait exclure sur un tag", () => {
    expect(
      matchesConditions(client(), [
        { field: "has_tag", op: "!=", value: "tag-instagram" },
      ] as SegmentCondition[])
    ).toBe(false);
  });

  it("reconnaît la souscription à un accompagnement", () => {
    expect(
      matchesConditions(client(), [
        { field: "has_accompagnement", op: "=", value: true },
      ] as SegmentCondition[])
    ).toBe(true);
    expect(
      matchesConditions(client({ has_accompagnement: false }), [
        { field: "has_accompagnement", op: "=", value: true },
      ] as SegmentCondition[])
    ).toBe(false);
  });

  it("croise un tag et une souscription, le cas d'usage visé", () => {
    expect(
      matchesConditions(client(), [
        { field: "has_accompagnement", op: "=", value: true },
        { field: "has_tag", op: "=", value: "tag-instagram" },
      ] as SegmentCondition[])
    ).toBe(true);
  });

  it("ignore une condition dont le champ est inconnu plutôt que de tout accepter", () => {
    expect(
      matchesConditions(client(), [
        { field: "champ_inexistant", op: "=", value: 1 },
      ] as unknown as SegmentCondition[])
    ).toBe(false);
  });
});
