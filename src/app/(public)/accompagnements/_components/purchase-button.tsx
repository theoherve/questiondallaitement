"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, ShoppingCart } from "lucide-react";
import { KlarnaNote } from "@/components/klarna-note";
import { purchaseFormation } from "../actions";

type PurchaseButtonProps = {
  formationId: string;
  isLoggedIn: boolean;
  isEnrolled: boolean;
  /**
   * Libellé orienté bénéfice, propre à l'accompagnement (« Je soulage la
   * douleur maintenant »…). Sans lui, on retombe sur un libellé générique.
   */
  ctaLabel?: string;
};

export const PurchaseButton = ({
  formationId,
  isLoggedIn,
  isEnrolled,
  ctaLabel,
}: PurchaseButtonProps) => {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (isEnrolled) {
    return (
      <Button asChild className="w-full bg-green-600 hover:bg-green-700">
        <a
          href={`/espace-client/accompagnements/${formationId}`}
          data-testid="purchase-access-cta"
          tabIndex={0}
        >
          Accéder à l&apos;accompagnement
        </a>
      </Button>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="space-y-2">
        <Button asChild className="w-full bg-primary-red hover:bg-primary-red-dark">
          <a
            href={`/connexion?redirect=/accompagnements/${formationId}`}
            data-testid="purchase-login-cta"
            tabIndex={0}
          >
            <ShoppingCart className="mr-2 h-4 w-4" />
            {ctaLabel ?? "Se connecter pour acheter"}
          </a>
        </Button>
        <p className="text-center text-xs text-primary-green/60">
          Accès immédiat après connexion
        </p>
      </div>
    );
  }

  const handlePurchase = () => {
    setError(null);
    startTransition(async () => {
      const result = await purchaseFormation(formationId);

      if (result.success && result.data?.redirect_url) {
        window.location.href = result.data.redirect_url;
        return;
      }

      // `purchaseFormation` echoue sur six chemins distincts (deja inscrite,
      // accompagnement depublie, consultante sans compte Connect, erreur
      // Stripe…). Sans affichage, le bouton cesse simplement de tourner et la
      // cliente reclique indefiniment sans jamais savoir pourquoi.
      setError(result.error ?? "L'achat n'a pas pu démarrer. Réessayez.");
    });
  };

  return (
    <div className="space-y-3">
      <Button
        onClick={handlePurchase}
        disabled={isPending}
        data-testid="purchase-button"
        className="w-full bg-primary-red hover:bg-primary-red-dark"
      >
        {isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <ShoppingCart className="mr-2 h-4 w-4" />
        )}
        {ctaLabel ?? "Acheter l'accompagnement"}
      </Button>
      <KlarnaNote />
      {error && (
        <p
          role="alert"
          data-testid="purchase-error"
          className="text-sm text-destructive"
        >
          {error}
        </p>
      )}
    </div>
  );
};
