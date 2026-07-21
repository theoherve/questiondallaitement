import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────

const mockRefundsCreate = vi.fn();
const mockPaymentIntentsRetrieve = vi.fn();
const mockChargesRetrieve = vi.fn();
const mockApplicationFeesCreateRefund = vi.fn();
const mockTransfersList = vi.fn();
const mockTransferReversal = vi.fn();

vi.mock("./client", () => ({
  stripe: {
    refunds: { create: (...a: unknown[]) => mockRefundsCreate(...a) },
    paymentIntents: {
      retrieve: (...a: unknown[]) => mockPaymentIntentsRetrieve(...a),
    },
    charges: { retrieve: (...a: unknown[]) => mockChargesRetrieve(...a) },
    transfers: {
      list: (...a: unknown[]) => mockTransfersList(...a),
      createReversal: (...a: unknown[]) => mockTransferReversal(...a),
    },
    applicationFees: {
      createRefund: (...a: unknown[]) => mockApplicationFeesCreateRefund(...a),
    },
  },
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: vi.fn() }),
}));

import { createRefund } from "./connect";

const PI = "pi_test_001";

/**
 * Charge destination telle que `charges.retrieve` la renvoie : un transfert
 * vers le compte connecte et une commission plateforme.
 *
 * Ces deux champs sont volontairement absents de la charge imbriquee dans le
 * PaymentIntent — c'est le comportement reel de l'API, et le mock doit le
 * reproduire. La premiere version de ce test les y plaçait, ce qui validait un
 * code qui ne renversait rien en production.
 */
const destinationCharge = ({
  feeAmount = 1200,
  feeRefunded = 0,
  hasTransfer = true,
} = {}) => ({
  id: "ch_test_001",
  amount: 8000,
  transfer: hasTransfer ? { id: "tr_test_001", amount: 8000 } : null,
  application_fee: feeAmount
    ? { id: "fee_test_001", amount: feeAmount, amount_refunded: feeRefunded }
    : null,
});

describe("createRefund", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRefundsCreate.mockResolvedValue({ id: "re_test", amount: 8000 });
    mockPaymentIntentsRetrieve.mockResolvedValue({
      id: PI,
      latest_charge: "ch_test_001",
    });
    mockChargesRetrieve.mockResolvedValue(destinationCharge());
    mockApplicationFeesCreateRefund.mockResolvedValue({ id: "fr_test" });
    mockTransfersList.mockResolvedValue({ data: [] });
    mockTransferReversal.mockResolvedValue({ id: "trr_test" });
  });

  it("renverse le transfert vers la consultante", async () => {
    // Sans `reverse_transfer`, la plateforme rembourse la cliente sur ses
    // propres fonds et la consultante conserve l'integralite du virement :
    // mesure sur Stripe en test, la plateforme perdait 6800 sur une
    // reservation de 8000 remboursee.
    await createRefund(PI);

    expect(mockRefundsCreate).toHaveBeenCalledWith(
      expect.objectContaining({ payment_intent: PI, reverse_transfer: true }),
    );
  });

  it("rend l'integralite de la commission plateforme", async () => {
    // Decision produit : la plateforme ne preleve rien sur une annulation.
    // `refund_application_fee` ne rembourserait la commission qu'au prorata
    // du montant rembourse — d'ou le remboursement explicite du solde entier.
    await createRefund(PI);

    expect(mockApplicationFeesCreateRefund).toHaveBeenCalledWith(
      "fee_test_001",
      { amount: 1200 },
    );
  });

  it("rembourse partiellement sans toucher au reste", async () => {
    await createRefund(PI, 4000);

    expect(mockRefundsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        payment_intent: PI,
        amount: 4000,
        reverse_transfer: true,
      }),
    );
    // Commission rendue en entier meme sur un remboursement partiel : la
    // penalite revient integralement a la consultante.
    expect(mockApplicationFeesCreateRefund).toHaveBeenCalledWith(
      "fee_test_001",
      { amount: 1200 },
    );
  });

  it("ne rend que le solde d'une commission deja partiellement remboursee", async () => {
    // Deuxieme remboursement sur le meme paiement : redemander 1200 ferait
    // echouer l'appel et, avec lui, toute l'annulation.
    mockChargesRetrieve.mockResolvedValue(
      destinationCharge({ feeRefunded: 500 }),
    );

    await createRefund(PI, 1000);

    expect(mockApplicationFeesCreateRefund).toHaveBeenCalledWith(
      "fee_test_001",
      { amount: 700 },
    );
  });

  it("ne retouche pas une commission deja entierement remboursee", async () => {
    mockChargesRetrieve.mockResolvedValue(
      destinationCharge({ feeRefunded: 1200 }),
    );

    await createRefund(PI, 1000);

    expect(mockApplicationFeesCreateRefund).not.toHaveBeenCalled();
  });

  it("n'exige pas de transfert a renverser", async () => {
    // Un paiement sans compte connecte — cas d'un accompagnement de la
    // plateforme. `reverse_transfer` ferait echouer l'appel Stripe.
    mockChargesRetrieve.mockResolvedValue(
      destinationCharge({ hasTransfer: false, feeAmount: 0 }),
    );

    await createRefund(PI);

    expect(mockRefundsCreate).toHaveBeenCalledWith({ payment_intent: PI });
    expect(mockApplicationFeesCreateRefund).not.toHaveBeenCalled();
  });

  it("rembourse la cliente meme si la commission ne peut pas etre rendue", async () => {
    // L'argent de la cliente prime. Un echec sur la commission — deja
    // remboursee, litige en cours — ne doit pas laisser une annulation a
    // moitie faite, avec une reservation annulee et aucun remboursement.
    mockApplicationFeesCreateRefund.mockRejectedValue(new Error("fee locked"));

    const refund = await createRefund(PI);

    expect(refund).toMatchObject({ id: "re_test" });
    expect(mockRefundsCreate).toHaveBeenCalled();
  });

  // ─── Ventes reparties entre plusieurs comptes ──────────────

  it("reprend les parts versees quand la charge est restee sur la plateforme", async () => {
    // `reverse_transfer` ne connait que le transfert porte par la charge. Une
    // vente repartie n'en a pas : sans reprise explicite, la plateforme
    // rembourse la cliente pendant que les deux consultantes gardent leur part.
    mockChargesRetrieve.mockResolvedValue(
      destinationCharge({ hasTransfer: false, feeAmount: 0 }),
    );
    mockTransfersList.mockResolvedValue({
      data: [
        { id: "tr_collab", amount: 2400, amount_reversed: 0 },
        { id: "tr_owner", amount: 5600, amount_reversed: 0 },
      ],
    });

    await createRefund(PI);

    expect(mockTransferReversal).toHaveBeenCalledWith("tr_collab", { amount: 2400 });
    expect(mockTransferReversal).toHaveBeenCalledWith("tr_owner", { amount: 5600 });
  });

  it("ne reprend que la fraction remboursee", async () => {
    mockChargesRetrieve.mockResolvedValue(
      destinationCharge({ hasTransfer: false, feeAmount: 0 }),
    );
    mockRefundsCreate.mockResolvedValue({ id: "re_test", amount: 4000 });
    mockTransfersList.mockResolvedValue({
      data: [{ id: "tr_collab", amount: 2400, amount_reversed: 0 }],
    });

    await createRefund(PI, 4000);

    // 50 % rembourse sur 8000 → on reprend la moitie de chaque part.
    expect(mockTransferReversal).toHaveBeenCalledWith("tr_collab", { amount: 1200 });
  });

  it("ne reprend jamais plus que ce qui reste sur un virement", async () => {
    // Deuxieme remboursement : demander a nouveau la part entiere ferait
    // echouer l'appel Stripe.
    mockChargesRetrieve.mockResolvedValue(
      destinationCharge({ hasTransfer: false, feeAmount: 0 }),
    );
    mockTransfersList.mockResolvedValue({
      data: [{ id: "tr_collab", amount: 2400, amount_reversed: 2000 }],
    });

    await createRefund(PI);

    expect(mockTransferReversal).toHaveBeenCalledWith("tr_collab", { amount: 400 });
  });

  it("ne touche pas aux virements groupes sur une charge destination", async () => {
    // Les fonds sont deja repris par `reverse_transfer` : y ajouter une
    // reprise manuelle reprendrait deux fois.
    await createRefund(PI);

    expect(mockTransferReversal).not.toHaveBeenCalled();
  });
});