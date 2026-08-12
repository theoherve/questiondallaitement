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
import { Plus, Loader2 } from "lucide-react";
import { createManualInvoice } from "../actions";

type Client = { id: string; label: string };

/**
 * Creation d'une facture libre (hors Stripe) : virement, cheque ou especes a
 * venir. L'echeance est optionnelle — vide, la facture est due a reception.
 */
export const NewInvoiceButton = ({ clients }: { clients: Client[] }) => {
  const [open, setOpen] = useState(false);
  const [clientId, setClientId] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const reset = () => {
    setClientId("");
    setDescription("");
    setAmount("");
    setDueDate("");
    setError(null);
  };

  const handleSubmit = () => {
    setError(null);
    const euros = Number(amount.replace(",", "."));
    if (!clientId || !description.trim() || !Number.isFinite(euros) || euros <= 0) {
      setError("Renseignez une cliente, une désignation et un montant valide.");
      return;
    }
    startTransition(async () => {
      const result = await createManualInvoice({
        clientId,
        description: description.trim(),
        ttcCents: Math.round(euros * 100),
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
      });
      if (result.success) {
        setOpen(false);
        reset();
      } else {
        setError(result.error ?? "Erreur");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) reset(); }}>
      <DialogTrigger asChild>
        <Button className="bg-primary-green hover:bg-primary-green/90">
          <Plus className="mr-1 h-4 w-4" />
          Nouvelle facture
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouvelle facture</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-invoice-client">Cliente</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger id="new-invoice-client">
                <SelectValue placeholder="Choisir une cliente" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-invoice-description">Désignation</Label>
            <Input
              id="new-invoice-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Pack de 3 consultations"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="new-invoice-amount">Montant TTC (€)</Label>
              <Input
                id="new-invoice-amount"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-invoice-due-date">
                Échéance{" "}
                <span className="text-muted-foreground">(à réception si vide)</span>
              </Label>
              <Input
                id="new-invoice-due-date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
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
          <Button
            onClick={handleSubmit}
            disabled={isPending}
            className="bg-primary-green hover:bg-primary-green/90"
          >
            {isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            Émettre la facture
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
