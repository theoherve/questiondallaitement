"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, ShoppingCart } from "lucide-react";
import { purchaseFormation } from "../actions";

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

  if (isEnrolled) {
    return (
      <Button asChild className="w-full bg-green-600 hover:bg-green-700">
        <a href={`/espace-client/accompagnements/${formationId}`} tabIndex={0}>
          Accéder à l&apos;accompagnement
        </a>
      </Button>
    );
  }

  if (!isLoggedIn) {
    return (
      <Button asChild className="w-full bg-primary-red hover:bg-primary-red-dark">
        <a href={`/connexion?redirect=/accompagnements/${formationId}`} tabIndex={0}>
          <ShoppingCart className="mr-2 h-4 w-4" />
          Se connecter pour acheter
        </a>
      </Button>
    );
  }

  const handlePurchase = () => {
    startTransition(async () => {
      const result = await purchaseFormation(formationId);
      if (result.success && result.data?.redirect_url) {
        window.location.href = result.data.redirect_url;
      }
    });
  };

  return (
    <Button
      onClick={handlePurchase}
      disabled={isPending}
      className="w-full bg-primary-red hover:bg-primary-red-dark"
    >
      {isPending ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <ShoppingCart className="mr-2 h-4 w-4" />
      )}
      Acheter l&apos;accompagnement
    </Button>
  );
};
