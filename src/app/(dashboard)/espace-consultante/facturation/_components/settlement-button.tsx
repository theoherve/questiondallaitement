"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Wallet, Loader2 } from "lucide-react";
import { recordSettlement } from "../actions";

const METHODS = [
  { value: "transfer", label: "Virement" },
  { value: "check", label: "Chèque" },
  { value: "cash", label: "Espèces" },
] as const;

export const SettlementButton = ({
  invoiceId,
  remainingCents,
}: {
  invoiceId: string;
  remainingCents: number;
}) => {
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<(typeof METHODS)[number]["value"]>("transfer");
  const [amount, setAmount] = useState((remainingCents / 100).toFixed(2));
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = () => {
    setError(null);
    const euros = Number(amount.replace(",", "."));
    if (!Number.isFinite(euros) || euros <= 0) {
      setError("Montant invalide.");
      return;
    }
    startTransition(async () => {
      const result = await recordSettlement({
        invoiceId,
        method,
        amountCents: Math.round(euros * 100),
        paidAt: new Date(paidAt).toISOString(),
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
          <Wallet className="mr-1 h-4 w-4" />
          Enregistrer un règlement
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enregistrer un règlement</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="settlement-method">Moyen de paiement</Label>
            <Select value={method} onValueChange={(v) => setMethod(v as typeof method)}>
              <SelectTrigger id="settlement-method">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {METHODS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="settlement-amount">Montant (€)</Label>
              <Input
                id="settlement-amount"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="settlement-date">Date</Label>
              <Input
                id="settlement-date"
                type="date"
                value={paidAt}
                onChange={(e) => setPaidAt(e.target.value)}
              />
            </div>
          </div>
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={isPending} className="bg-primary-green hover:bg-primary-green/90">
            {isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
