"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { updateBillingProfile } from "../actions";
import {
  isBillingComplete,
  type BillingProfile,
} from "@/lib/invoicing/billing-profile";

type BillingTabProps = {
  billing: BillingProfile & { billing_legal_form: string | null };
};

export const BillingTab = ({ billing }: BillingTabProps) => {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{
    kind: "ok" | "error";
    text: string;
  } | null>(null);

  const complete = isBillingComplete(billing);

  const handleSubmit = (formData: FormData) => {
    setMessage(null);
    startTransition(async () => {
      const result = await updateBillingProfile(formData);
      setMessage(
        result.success
          ? { kind: "ok", text: "Informations de facturation enregistrées." }
          : { kind: "error", text: result.error ?? "Erreur." },
      );
    });
  };

  return (
    <div className="max-w-2xl space-y-6">
      {/* Sans ces mentions, aucune facture conforme ne peut etre emise, donc
          aucune vente en ligne : le bandeau le dit clairement plutot que de
          laisser la consultante decouvrir le blocage au premier achat. */}
      {!complete && (
        <div
          className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"
          role="alert"
        >
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <p>
            Tant que ces informations ne sont pas complètes, aucune facture ne
            peut être émise et <strong>les paiements en ligne sont refusés</strong>.
            Complétez-les avant d&apos;ouvrir vos consultations à la réservation.
          </p>
        </div>
      )}

      {complete && (
        <div className="flex items-center gap-2 text-sm text-green-700">
          <CheckCircle2 className="h-5 w-5" />
          Vos informations de facturation sont complètes.
        </div>
      )}

      <form action={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="billing_legal_name">Raison sociale / Nom</Label>
          <Input
            id="billing_legal_name"
            name="billing_legal_name"
            defaultValue={billing.billing_legal_name ?? ""}
            placeholder="Carole HERVÉ"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="billing_address">Adresse</Label>
          <Textarea
            id="billing_address"
            name="billing_address"
            defaultValue={billing.billing_address ?? ""}
            placeholder="1 rue …, 44000 Nantes"
            rows={2}
            required
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="billing_siren">SIREN</Label>
            <Input
              id="billing_siren"
              name="billing_siren"
              defaultValue={billing.billing_siren ?? ""}
              placeholder="540075819"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="billing_vat_number">N° TVA intracommunautaire</Label>
            <Input
              id="billing_vat_number"
              name="billing_vat_number"
              defaultValue={billing.billing_vat_number ?? ""}
              placeholder="FR94540075819"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="billing_legal_form">
            Forme juridique{" "}
            <span className="text-muted-foreground">(facultatif)</span>
          </Label>
          <Input
            id="billing_legal_form"
            name="billing_legal_form"
            defaultValue={billing.billing_legal_form ?? ""}
            placeholder="Entreprise individuelle"
          />
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="submit"
            disabled={isPending}
            className="bg-primary-red hover:bg-primary-red-dark"
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enregistrer
          </Button>
          {message && (
            <span
              className={
                message.kind === "ok"
                  ? "text-sm text-green-700"
                  : "text-sm text-destructive"
              }
              role="status"
            >
              {message.text}
            </span>
          )}
        </div>
      </form>
    </div>
  );
};
