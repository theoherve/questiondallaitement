import { describe, it, expect } from "vitest";
import { routeSale } from "./sale-routing";

const ACCOUNT = "acct_consultante";

describe("routeSale", () => {
  it("verse directement a une consultante tierce", () => {
    // Cas courant : charge destination, la consultante recoit les fonds et la
    // plateforme retient sa commission.
    expect(
      routeSale({
        isPlatformOwner: false,
        stripeAccountId: ACCOUNT,
        commissionRate: 15,
        hasCollaborators: false,
      }),
    ).toEqual({
      holdOnPlatform: false,
      destinationAccountId: ACCOUNT,
      commissionRate: 15,
    });
  });

  it("garde sur la plateforme la vente de la consultante proprietaire", () => {
    // Carole est la plateforme. Router son propre encaissement vers un compte
    // connecte lui appartenant serait un aller-retour inutile : les fonds
    // partent chez elle pour revenir chez elle, en passant par un compte
    // Express qui peut etre facture.
    expect(
      routeSale({
        isPlatformOwner: true,
        stripeAccountId: ACCOUNT,
        commissionRate: 15,
        hasCollaborators: false,
      }),
    ).toEqual({
      holdOnPlatform: true,
      destinationAccountId: null,
      commissionRate: 0,
    });
  });

  it("n'applique aucune commission a la proprietaire", () => {
    // Une commission qu'elle se verse a elle-meme n'a pas de sens economique,
    // et elle apparaitrait dans les reversements Stripe comme un flux reel.
    const routing = routeSale({
      isPlatformOwner: true,
      stripeAccountId: ACCOUNT,
      commissionRate: 15,
      hasCollaborators: false,
    });

    expect(routing?.commissionRate).toBe(0);
  });

  it("n'exige pas de compte connecte pour la proprietaire", () => {
    // Elle n'a aucune raison d'en avoir un : c'est son compte plateforme qui
    // encaisse.
    expect(
      routeSale({
        isPlatformOwner: true,
        stripeAccountId: null,
        commissionRate: 15,
        hasCollaborators: false,
      }),
    ).toEqual({
      holdOnPlatform: true,
      destinationAccountId: null,
      commissionRate: 0,
    });
  });

  it("garde sur la plateforme une vente a partager", () => {
    // 4-6 : une charge destination viderait le solde plateforme, qui n'aurait
    // plus de quoi payer les collaboratrices.
    expect(
      routeSale({
        isPlatformOwner: false,
        stripeAccountId: ACCOUNT,
        commissionRate: 15,
        hasCollaborators: true,
      }),
    ).toEqual({
      holdOnPlatform: true,
      destinationAccountId: null,
      commissionRate: 15,
    });
  });

  it("garde la commission a zero si la proprietaire a des collaboratrices", () => {
    // Les collaboratrices sont payees sur le net ; la proprietaire etant la
    // plateforme, il n'y a pas de commission a prelever au passage.
    const routing = routeSale({
      isPlatformOwner: true,
      stripeAccountId: null,
      commissionRate: 15,
      hasCollaborators: true,
    });

    expect(routing).toEqual({
      holdOnPlatform: true,
      destinationAccountId: null,
      commissionRate: 0,
    });
  });

  it("refuse une vente d'une tierce sans compte connecte", () => {
    // Sans destinataire ni statut de proprietaire, l'argent resterait sur la
    // plateforme sans que personne ne soit cense le recevoir.
    expect(
      routeSale({
        isPlatformOwner: false,
        stripeAccountId: null,
        commissionRate: 15,
        hasCollaborators: false,
      }),
    ).toBeNull();
  });
});
