import { describe, it, expect } from "vitest";
import { evaluatePromoCode } from "./evaluate";
import type { PromoCodeWithRules, PromoContext } from "./types";

const NOW = Date.parse("2026-08-06T12:00:00.000Z");
const HOUR = 3_600_000;

const makeCode = (
  overrides: Partial<PromoCodeWithRules> = {},
): PromoCodeWithRules => ({
  id: "code-1",
  code: "SUPERMAMAN",
  label: null,
  discount_type: "percent",
  discount_value: 15,
  scope_all: true,
  valid_from: null,
  valid_until: null,
  max_redemptions: null,
  max_per_user: 1,
  min_order_cents: 0,
  trigger_delay_hours: null,
  is_active: true,
  created_by: null,
  created_at: "2026-08-01T00:00:00.000Z",
  updated_at: "2026-08-01T00:00:00.000Z",
  targets: [],
  triggers: [],
  ...overrides,
});

const makeContext = (overrides: Partial<PromoContext> = {}): PromoContext => ({
  serviceKind: "formation",
  itemId: "formation-1",
  amountCents: 10_000,
  nowMs: NOW,
  globalRedemptions: 0,
  userRedemptions: 0,
  triggeringPurchases: [],
  ...overrides,
});

describe("evaluatePromoCode", () => {
  it("applique une remise en pourcentage", () => {
    expect(evaluatePromoCode(makeCode(), makeContext())).toEqual({
      ok: true,
      discountCents: 1500,
      finalCents: 8500,
    });
  });

  it("arrondit la remise en pourcentage au centime", () => {
    const result = evaluatePromoCode(
      makeCode({ discount_value: 15 }),
      makeContext({ amountCents: 3333 }),
    );
    expect(result).toEqual({ ok: true, discountCents: 500, finalCents: 2833 });
  });

  it("applique une remise fixe", () => {
    const result = evaluatePromoCode(
      makeCode({ discount_type: "fixed_cents", discount_value: 3000 }),
      makeContext(),
    );
    expect(result).toEqual({ ok: true, discountCents: 3000, finalCents: 7000 });
  });

  it("ne descend jamais sous zero", () => {
    const result = evaluatePromoCode(
      makeCode({ discount_type: "fixed_cents", discount_value: 3000 }),
      makeContext({ amountCents: 2000 }),
    );
    expect(result).toEqual({ ok: true, discountCents: 2000, finalCents: 0 });
  });

  it("refuse un code desactive", () => {
    const result = evaluatePromoCode(makeCode({ is_active: false }), makeContext());
    expect(result).toEqual({ ok: false, reason: "not_applicable" });
  });

  it("refuse un code avant sa fenetre", () => {
    const result = evaluatePromoCode(
      makeCode({ valid_from: "2026-08-07T00:00:00.000Z" }),
      makeContext(),
    );
    expect(result).toEqual({ ok: false, reason: "not_applicable" });
  });

  it("refuse un code apres sa fenetre", () => {
    const result = evaluatePromoCode(
      makeCode({ valid_until: "2026-08-06T11:00:00.000Z" }),
      makeContext(),
    );
    expect(result).toEqual({ ok: false, reason: "not_applicable" });
  });

  it("accepte un code dans sa fenetre", () => {
    const result = evaluatePromoCode(
      makeCode({
        valid_from: "2026-08-06T00:00:00.000Z",
        valid_until: "2026-08-07T00:00:00.000Z",
      }),
      makeContext(),
    );
    expect(result).toMatchObject({ ok: true });
  });

  it("accepte une cible par famille de service", () => {
    const result = evaluatePromoCode(
      makeCode({
        scope_all: false,
        targets: [{ target_type: "events_all", target_id: null }],
      }),
      makeContext({ serviceKind: "event", itemId: "formation-1" }),
    );
    expect(result).toMatchObject({ ok: true });
  });

  it("refuse quand la famille de service ne correspond pas", () => {
    const result = evaluatePromoCode(
      makeCode({
        scope_all: false,
        targets: [{ target_type: "events_all", target_id: null }],
      }),
      makeContext({ serviceKind: "formation" }),
    );
    expect(result).toEqual({ ok: false, reason: "not_applicable" });
  });

  it("accepte une cible sur un item precis", () => {
    const result = evaluatePromoCode(
      makeCode({
        scope_all: false,
        targets: [{ target_type: "formation", target_id: "formation-pack" }],
      }),
      makeContext({ itemId: "formation-pack" }),
    );
    expect(result).toMatchObject({ ok: true });
  });

  it("refuse un autre item que celui cible", () => {
    const result = evaluatePromoCode(
      makeCode({
        scope_all: false,
        targets: [{ target_type: "formation", target_id: "formation-pack" }],
      }),
      makeContext({ itemId: "formation-autre" }),
    );
    expect(result).toEqual({ ok: false, reason: "not_applicable" });
  });

  it("cible un service de rendez-vous par son type de consultation", () => {
    const result = evaluatePromoCode(
      makeCode({
        scope_all: false,
        targets: [{ target_type: "booking_service", target_id: "ct-1" }],
      }),
      makeContext({ serviceKind: "booking", itemId: "ct-1" }),
    );
    expect(result).toMatchObject({ ok: true });
  });

  it("refuse sous le montant minimum", () => {
    const result = evaluatePromoCode(
      makeCode({ min_order_cents: 6000 }),
      makeContext({ amountCents: 5900 }),
    );
    expect(result).toEqual({
      ok: false,
      reason: "min_order",
      minOrderCents: 6000,
    });
  });

  it("accepte exactement au montant minimum", () => {
    const result = evaluatePromoCode(
      makeCode({ min_order_cents: 6000 }),
      makeContext({ amountCents: 6000 }),
    );
    expect(result).toMatchObject({ ok: true });
  });

  it("refuse quand le quota global est atteint", () => {
    const result = evaluatePromoCode(
      makeCode({ max_redemptions: 50 }),
      makeContext({ globalRedemptions: 50 }),
    );
    expect(result).toEqual({ ok: false, reason: "exhausted" });
  });

  it("refuse quand la cliente a deja utilise le code", () => {
    const result = evaluatePromoCode(
      makeCode({ max_per_user: 1 }),
      makeContext({ userRedemptions: 1 }),
    );
    expect(result).toEqual({ ok: false, reason: "already_used" });
  });

  it("refuse un code a declencheur sans achat correspondant", () => {
    const result = evaluatePromoCode(
      makeCode({
        trigger_delay_hours: 48,
        triggers: [{ trigger_type: "event_purchase", target_id: null }],
      }),
      makeContext(),
    );
    expect(result).toEqual({ ok: false, reason: "not_applicable" });
  });

  it("refuse un declencheur hors delai", () => {
    const result = evaluatePromoCode(
      makeCode({
        trigger_delay_hours: 48,
        triggers: [{ trigger_type: "event_purchase", target_id: null }],
      }),
      makeContext({
        triggeringPurchases: [
          { kind: "event", itemId: "formation-1", purchasedAtMs: NOW - 49 * HOUR },
        ],
      }),
    );
    expect(result).toEqual({ ok: false, reason: "not_applicable" });
  });

  it("accepte un declencheur dans le delai", () => {
    const result = evaluatePromoCode(
      makeCode({
        discount_type: "fixed_cents",
        discount_value: 2000,
        trigger_delay_hours: 48,
        triggers: [{ trigger_type: "event_purchase", target_id: null }],
      }),
      makeContext({
        triggeringPurchases: [
          { kind: "event", itemId: "formation-1", purchasedAtMs: NOW - 47 * HOUR },
        ],
      }),
    );
    expect(result).toEqual({ ok: true, discountCents: 2000, finalCents: 8000 });
  });

  it("refuse un declencheur portant sur un autre produit", () => {
    const result = evaluatePromoCode(
      makeCode({
        trigger_delay_hours: 48,
        triggers: [{ trigger_type: "event_purchase", target_id: "formation-cible" }],
      }),
      makeContext({
        triggeringPurchases: [
          { kind: "event", itemId: "formation-autre", purchasedAtMs: NOW - HOUR },
        ],
      }),
    );
    expect(result).toEqual({ ok: false, reason: "not_applicable" });
  });
});
