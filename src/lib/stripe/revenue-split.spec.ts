import { describe, it, expect } from "vitest";
import { splitAccompagnementRevenue } from "./revenue-split";

const OWNER = "proprietaire";

describe("splitAccompagnementRevenue", () => {
  it("verse tout a la proprietaire sans collaboratrice", () => {
    const parts = splitAccompagnementRevenue({
      amountCents: 9900,
      platformFeeCents: 1485,
      ownerId: OWNER,
      collaborators: [],
    });

    expect(parts).toEqual([{ consultantId: OWNER, amountCents: 8415 }]);
  });

  it("retire la part des collaboratrices de celle de la proprietaire", () => {
    // Le net (8415) se partage : 30 % a la collaboratrice, le reste a la
    // proprietaire. Avant, la charge destination versait 8415 a la
    // proprietaire *puis* la plateforme payait la collaboratrice de sa poche.
    const parts = splitAccompagnementRevenue({
      amountCents: 9900,
      platformFeeCents: 1485,
      ownerId: OWNER,
      collaborators: [{ consultantId: "collab", revenueShare: 30 }],
    });

    expect(parts).toEqual([
      { consultantId: "collab", amountCents: 2525 },
      { consultantId: OWNER, amountCents: 5890 },
    ]);
  });

  it("ne cree ni ne perd un centime sur des arrondis defavorables", () => {
    // 3 collaboratrices a 33 % d'un net indivisible : la proprietaire absorbe
    // le reste, sinon la somme des virements depasserait la charge et Stripe
    // refuserait le dernier.
    const parts = splitAccompagnementRevenue({
      amountCents: 10000,
      platformFeeCents: 1,
      ownerId: OWNER,
      collaborators: [
        { consultantId: "a", revenueShare: 33 },
        { consultantId: "b", revenueShare: 33 },
        { consultantId: "c", revenueShare: 33 },
      ],
    });

    const total = parts.reduce((sum, p) => sum + p.amountCents, 0);
    expect(total).toBe(9999);
  });

  it("refuse une repartition depassant 100 %", () => {
    // Une saisie a 60 % + 60 % laisserait une part negative a la proprietaire :
    // Stripe rejetterait le virement et la vente resterait a moitie repartie.
    expect(() =>
      splitAccompagnementRevenue({
        amountCents: 9900,
        platformFeeCents: 1485,
        ownerId: OWNER,
        collaborators: [
          { consultantId: "a", revenueShare: 60 },
          { consultantId: "b", revenueShare: 60 },
        ],
      }),
    ).toThrow(/100/);
  });

  it("omet une part nulle plutot que de tenter un virement de zero", () => {
    const parts = splitAccompagnementRevenue({
      amountCents: 9900,
      platformFeeCents: 1485,
      ownerId: OWNER,
      collaborators: [{ consultantId: "collab", revenueShare: 0 }],
    });

    expect(parts).toEqual([{ consultantId: OWNER, amountCents: 8415 }]);
  });

  it("accepte que les collaboratrices prennent tout le net", () => {
    const parts = splitAccompagnementRevenue({
      amountCents: 9900,
      platformFeeCents: 1485,
      ownerId: OWNER,
      collaborators: [{ consultantId: "collab", revenueShare: 100 }],
    });

    expect(parts).toEqual([{ consultantId: "collab", amountCents: 8415 }]);
  });
});
