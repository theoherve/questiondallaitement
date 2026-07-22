"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PencilLine, Loader2 } from "lucide-react";
import { correctInvoice } from "../actions";

/**
 * Correction d'une facture : la consultante ajuste designation et montant TTC.
 * Une facture emise etant immuable, la correction emet un avoir puis une
 * facture corrigee — d'ou l'avertissement dans le dialogue.
 */
export const CorrectInvoiceButton = ({
  invoiceId,
  defaultDescription,
  defaultTtcEuros,
}: {
  invoiceId: string;
  defaultDescription: string;
  defaultTtcEuros: string;
}) => {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState(defaultDescription);
  const [amount, setAmount] = useState(defaultTtcEuros);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = () => {
    setError(null);
    const euros = Number(amount.replace(",", "."));
    if (!description.trim() || !Number.isFinite(euros) || euros <= 0) {
      setError("Renseignez une désignation et un montant valide.");
      return;
    }
    startTransition(async () => {
      const result = await correctInvoice(invoiceId, {
        description: description.trim(),
        ttcCents: Math.round(euros * 100),
      });
      if (result.success) {
        setOpen(false);
      } else {
        setError(result.error ?? "Erreur");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <PencilLine className="mr-1 h-4 w-4" />
          Corriger
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Corriger la facture</DialogTitle>
          <DialogDescription>
            Une facture émise ne se modifie pas : un avoir l&apos;annule et une
            facture corrigée est émise, puis envoyée à la cliente.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="correct-description">Désignation</Label>
            <Input
              id="correct-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="correct-amount">Montant TTC (€)</Label>
            <Input
              id="correct-amount"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending}
            className="bg-primary-green hover:bg-primary-green/90"
          >
            {isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            Émettre la correction
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
