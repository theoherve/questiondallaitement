"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, ShoppingCart } from "lucide-react";
import { purchaseFormation } from "../actions";
import { WITHDRAWAL_TEXTS } from "@/lib/legal/withdrawal";

type PurchaseButtonProps = {
  formationId: string;
  isLoggedIn: boolean;
  isEnrolled: boolean;
};

export const PurchaseButton = ({
  formationId,
  isLoggedIn,
  isEnrolled,
}: PurchaseButtonProps) => {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [waiverAccepted, setWaiverAccepted] = useState(false);

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
      <Button asChild className="w-full bg-primary-red hover:bg-primary-red-dark">
        <a
          href={`/connexion?redirect=/accompagnements/${formationId}`}
          data-testid="purchase-login-cta"
          tabIndex={0}
        >
          <ShoppingCart className="mr-2 h-4 w-4" />
          Se connecter pour acheter
        </a>
      </Button>
    );
  }

  const handlePurchase = () => {
    setError(null);
    startTransition(async () => {
      const result = await purchaseFormation(formationId, waiverAccepted);

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
      {/* L'acces au contenu est immediat : l'execution commence des le
          paiement, donc la renonciation est toujours requise. */}
      <label className="flex cursor-pointer items-start gap-2 text-xs text-primary-green/80">
        <input
          type="checkbox"
          checked={waiverAccepted}
          onChange={(e) => setWaiverAccepted(e.target.checked)}
          data-testid="withdrawal-waiver"
          className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-primary-red"
        />
        <span>{WITHDRAWAL_TEXTS.formation}</span>
      </label>

      <Button
        onClick={handlePurchase}
        disabled={isPending || !waiverAccepted}
        data-testid="purchase-button"
        className="w-full bg-primary-red hover:bg-primary-red-dark"
      >
        {isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <ShoppingCart className="mr-2 h-4 w-4" />
        )}
        Acheter l&apos;accompagnement
      </Button>
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
