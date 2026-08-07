"use client";

import { useState, useTransition } from "react";
import { Loader2, Tag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { previewPromoCode } from "@/app/(public)/promo/actions";
import type { PromoServiceKind } from "@/lib/promo/types";

export type AppliedPromo = {
  code: string;
  discountCents: number;
  finalCents: number;
};

type PromoCodeFieldProps = {
  serviceKind: PromoServiceKind;
  /** formation.id, formation.id ou consultation_type_id. */
  itemId: string;
  amountCents: number;
  currency: string;
  onApplied: (applied: AppliedPromo | null) => void;
};

const formatPrice = (cents: number, currency: string): string =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(
    cents / 100,
  );

export const PromoCodeField = ({
  serviceKind,
  itemId,
  amountCents,
  currency,
  onApplied,
}: PromoCodeFieldProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [value, setValue] = useState("");
  const [applied, setApplied] = useState<AppliedPromo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleApply = () => {
    setError(null);
    startTransition(async () => {
      const result = await previewPromoCode({
        code: value,
        serviceKind,
        itemId,
        amountCents,
      });

      if (!result.success || !result.data) {
        setApplied(null);
        onApplied(null);
        setError(result.error ?? "Ce code n'est pas valable pour cet achat.");
        return;
      }

      setApplied(result.data);
      onApplied(result.data);
    });
  };

  const handleRemove = () => {
    setApplied(null);
    setValue("");
    setError(null);
    onApplied(null);
  };

  if (applied) {
    return (
      <div
        data-testid="promo-applied"
        className="space-y-1 rounded-lg border border-primary-green/20 bg-primary-green/5 p-3 text-sm"
      >
        <div className="flex items-center justify-between text-primary-green/70">
          <span>Prix initial</span>
          <span>{formatPrice(amountCents, currency)}</span>
        </div>
        <div className="flex items-center justify-between text-primary-green">
          <span>Remise {applied.code}</span>
          <span>-{formatPrice(applied.discountCents, currency)}</span>
        </div>
        <div className="flex items-center justify-between font-semibold text-primary-green">
          <span>Total</span>
          <span data-testid="promo-total">
            {formatPrice(applied.finalCents, currency)}
          </span>
        </div>
        <button
          type="button"
          onClick={handleRemove}
          data-testid="promo-remove"
          tabIndex={0}
          aria-label="Retirer le code promo"
          className="cursor-pointer inline-flex items-center gap-1 pt-1 text-xs text-primary-green/60 underline"
        >
          <X className="h-3 w-3" />
          Retirer le code
        </button>
      </div>
    );
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        data-testid="promo-open"
        tabIndex={0}
        aria-label="Saisir un code promo"
        className="cursor-pointer inline-flex items-center gap-1 text-sm text-primary-green/70 underline"
      >
        <Tag className="h-3.5 w-3.5" />
        J&apos;ai un code promo
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(formation) => setValue(formation.target.value.toUpperCase())}
          placeholder="VOTRECODE"
          data-testid="promo-input"
          aria-label="Code promo"
          className="uppercase"
        />
        <Button
          type="button"
          variant="outline"
          onClick={handleApply}
          disabled={isPending || !value.trim()}
          data-testid="promo-apply"
          tabIndex={0}
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Appliquer"}
        </Button>
      </div>
      {error && (
        <p
          role="alert"
          data-testid="promo-error"
          className="text-sm text-destructive"
        >
          {error}
        </p>
      )}
    </div>
  );
};
