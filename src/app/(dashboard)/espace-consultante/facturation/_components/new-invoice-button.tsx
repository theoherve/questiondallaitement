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
  const [giftCardCode, setGiftCardCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  /**
   * Facture emise mais carte cadeau non appliquee : la facture est bien la, il
   * n'y a rien a corriger dans le formulaire. On garde donc le dialogue ouvert
   * avec le message plutot que de le fermer comme sur un succes complet.
   */
  const [warning, setWarning] = useState<string | null>(null);
  /**
   * Une facture legalement numerotee vient d'etre emise pour ce dialogue.
   * Une fois vrai, on n'autorise plus de nouvelle soumission du meme
   * formulaire (qui emettrait une deuxieme facture et retenterait le
   * debit de la meme carte cadeau) : le bouton devient « Fermer ».
   */
  const [submitted, setSubmitted] = useState(false);
  const [isPending, startTransition] = useTransition();

  const reset = () => {
    setClientId("");
    setDescription("");
    setAmount("");
    setDueDate("");
    setGiftCardCode("");
    setError(null);
    setWarning(null);
    setSubmitted(false);
  };

  const handleSubmit = () => {
    setError(null);
    setWarning(null);
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
        giftCardCode: giftCardCode.trim() || undefined,
      });
      if (result.success && result.warning) {
        setWarning(result.warning);
        setSubmitted(true);
      } else if (result.success) {
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
          <div className="space-y-2">
            <Label htmlFor="new-invoice-gift-card">
              Code carte cadeau{" "}
              <span className="text-muted-foreground">(optionnel)</span>
            </Label>
            <Input
              id="new-invoice-gift-card"
              value={giftCardCode}
              onChange={(e) => setGiftCardCode(e.target.value.toUpperCase())}
              placeholder="CADEAU-XXXXXX"
            />
          </div>
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          {warning && (
            <p className="text-sm text-amber-600" role="alert">
              {warning}
            </p>
          )}
        </div>
        <DialogFooter>
          {!submitted && (
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
              Annuler
            </Button>
          )}
          {submitted ? (
            <Button
              onClick={() => setOpen(false)}
              className="bg-primary-green hover:bg-primary-green/90"
            >
              Fermer
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isPending}
              className="bg-primary-green hover:bg-primary-green/90"
            >
              {isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              Émettre la facture
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
