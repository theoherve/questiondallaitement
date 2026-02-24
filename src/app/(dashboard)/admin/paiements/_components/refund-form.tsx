"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ArrowDownRight, Loader2 } from "lucide-react";
import { refundPayment } from "../actions";

type RefundFormProps = {
  paymentId: string;
  maxRefundableCents: number;
  currency: string;
  alreadyRefundedCents: number;
};

const formatPrice = (cents: number, currency: string): string =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
  }).format(cents / 100);

export const RefundForm = ({
  paymentId,
  maxRefundableCents,
  currency,
  alreadyRefundedCents,
}: RefundFormProps) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [refundType, setRefundType] = useState<"full" | "partial">("full");
  const [partialAmount, setPartialAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const amountCents =
    refundType === "full"
      ? maxRefundableCents
      : Math.round(parseFloat(partialAmount || "0") * 100);

  const isValid =
    refundType === "full" ||
    (amountCents > 0 && amountCents <= maxRefundableCents);

  const handleRefund = () => {
    setError(null);

    startTransition(async () => {
      const result = await refundPayment(
        paymentId,
        refundType === "partial" ? amountCents : undefined
      );

      setDialogOpen(false);

      if (!result.success) {
        setError(result.error ?? "Erreur lors du remboursement");
        return;
      }

      router.refresh();
    });
  };

  return (
    <Card className="border-destructive/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <ArrowDownRight className="h-5 w-5" />
          Remboursement
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {alreadyRefundedCents > 0 && (
          <p className="text-sm text-muted-foreground">
            Déjà remboursé : {formatPrice(alreadyRefundedCents, currency)}.
            Restant remboursable : {formatPrice(maxRefundableCents, currency)}.
          </p>
        )}

        <div className="flex gap-3">
          <Button
            type="button"
            variant={refundType === "full" ? "default" : "outline"}
            size="sm"
            onClick={() => setRefundType("full")}
          >
            Remboursement total
          </Button>
          <Button
            type="button"
            variant={refundType === "partial" ? "default" : "outline"}
            size="sm"
            onClick={() => setRefundType("partial")}
          >
            Remboursement partiel
          </Button>
        </div>

        {refundType === "partial" && (
          <div className="max-w-xs space-y-2">
            <Label htmlFor="partial-amount">Montant à rembourser (€)</Label>
            <Input
              id="partial-amount"
              type="number"
              min={0.01}
              max={maxRefundableCents / 100}
              step={0.01}
              value={partialAmount}
              onChange={(e) => setPartialAmount(e.target.value)}
              placeholder={`Max ${(maxRefundableCents / 100).toFixed(2)}`}
              aria-label="Montant du remboursement partiel"
            />
          </div>
        )}

        <p className="text-sm font-medium">
          Montant du remboursement : {formatPrice(amountCents, currency)}
        </p>

        {error && (
          <p className="text-sm font-medium text-destructive" role="alert">
            {error}
          </p>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              variant="destructive"
              disabled={!isValid || isPending}
            >
              Rembourser via Stripe
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmer le remboursement</DialogTitle>
              <DialogDescription>
                Vous allez rembourser{" "}
                <strong>{formatPrice(amountCents, currency)}</strong> au client
                via Stripe. Cette action est irréversible.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={isPending}
              >
                Annuler
              </Button>
              <Button
                variant="destructive"
                onClick={handleRefund}
                disabled={isPending}
              >
                {isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Confirmer le remboursement
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
