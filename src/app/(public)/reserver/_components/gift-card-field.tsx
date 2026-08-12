"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { checkGiftCardForBooking } from "../actions";
import { giftCardErrorMessage } from "@/lib/gift-cards/booking-errors";

export type AppliedGiftCard = { code: string; discountCents: number };

type GiftCardFieldProps = {
  /**
   * Type de consultation reserve. Indispensable : une carte « prestation » est
   * liee a une prestation precise, et sans cette information la verification ne
   * pourrait pas dire qu'elle ne vaut pas pour celle-ci.
   */
  consultationTypeId: string;
  /** Montant restant a couvrir, apres un eventuel code promo. */
  amountCents: number;
  currency: string;
  onApplied: (giftCard: AppliedGiftCard | null) => void;
};

const formatPrice = (cents: number, currency: string): string =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(cents / 100);

/**
 * Champ « Vous avez un code cadeau ? » du tunnel de reservation (§7.2).
 *
 * La verification est un apercu en lecture seule : elle n'ecrit rien et
 * n'engage rien. Le debit reel de la carte est refait cote serveur a la
 * soumission, sur le solde du moment — un apercu affiche ici ne vaut jamais
 * autorisation.
 */
export const GiftCardField = ({
  consultationTypeId,
  amountCents,
  currency,
  onApplied,
}: GiftCardFieldProps) => {
  const [code, setCode] = useState("");
  const [applied, setApplied] = useState<AppliedGiftCard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const verify = () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed || isPending) return;
    if (applied?.code === trimmed) return;

    setError(null);

    startTransition(async () => {
      const result = await checkGiftCardForBooking(
        trimmed,
        amountCents,
        consultationTypeId,
      );

      if (!result.ok) {
        setApplied(null);
        onApplied(null);
        setError(giftCardErrorMessage(result.error));
        return;
      }

      const next = { code: trimmed, discountCents: result.discountCents };
      setApplied(next);
      onApplied(next);
    });
  };

  const clear = () => {
    setCode("");
    setApplied(null);
    setError(null);
    onApplied(null);
  };

  const remaining = applied ? Math.max(0, amountCents - applied.discountCents) : null;

  return (
    <div className="space-y-2">
      <label
        htmlFor="booking-gift-card-code"
        className="text-sm font-medium text-primary-green"
      >
        Vous avez un code cadeau ?
      </label>

      <div className="flex gap-2">
        <Input
          id="booking-gift-card-code"
          data-testid="gift-card-code-input"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onBlur={verify}
          placeholder="CADEAU-XXXXXX"
          disabled={isPending}
        />
        {applied ? (
          <Button type="button" variant="ghost" onClick={clear}>
            Retirer
          </Button>
        ) : (
          <Button type="button" variant="outline" onClick={verify} disabled={isPending}>
            {isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            Vérifier
          </Button>
        )}
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {applied && (
        <p className="text-sm text-primary-green" role="status">
          Carte cadeau appliquée : {formatPrice(applied.discountCents, currency)}.{" "}
          {remaining === 0
            ? "Rien ne vous sera débité."
            : `Reste à régler : ${formatPrice(remaining ?? 0, currency)}.`}
        </p>
      )}
    </div>
  );
};
