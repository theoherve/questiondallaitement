"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { issueGiftCardManually } from "../actions";

type ConsultationTypeOption = { id: string; title: string; priceCents: number };

const AMOUNTS_CENTS = [9000, 13000, 17000];

/**
 * Emission manuelle d'une carte (geste commercial, dedommagement). Les montants
 * sont ceux de la vente en ligne : la saisie libre est exclue par le cadrage
 * (§7.1), pour qu'une carte emise a la main reste comparable a une carte
 * vendue.
 */
export const IssueGiftCardForm = ({
  consultationTypes,
}: {
  consultationTypes: ConsultationTypeOption[];
}) => {
  const router = useRouter();
  const [type, setType] = useState<"amount" | "service">("amount");
  const [amountCents, setAmountCents] = useState(AMOUNTS_CENTS[0]);
  const [consultationTypeId, setConsultationTypeId] = useState(
    consultationTypes[0]?.id ?? "",
  );
  const [buyerName, setBuyerName] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [beneficiaryName, setBeneficiaryName] = useState("");
  const [beneficiaryEmail, setBeneficiaryEmail] = useState("");
  const [personalMessage, setPersonalMessage] = useState("");
  const [deliveryMode, setDeliveryMode] = useState<"email" | "pdf">("email");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = () => {
    setError(null);
    setNotice(null);

    if (!buyerName.trim() || !buyerEmail.trim()) {
      setError("Renseignez le nom et l'email de la personne à qui la carte est remise.");
      return;
    }
    if (type === "service" && !consultationTypeId) {
      setError("Choisissez la prestation offerte.");
      return;
    }

    startTransition(async () => {
      const result = await issueGiftCardManually({
        type,
        amountCents: type === "amount" ? amountCents : undefined,
        consultationTypeId: type === "service" ? consultationTypeId : undefined,
        buyerName: buyerName.trim(),
        buyerEmail: buyerEmail.trim(),
        beneficiaryName: beneficiaryName.trim() || undefined,
        beneficiaryEmail: beneficiaryEmail.trim() || undefined,
        personalMessage: personalMessage.trim() || undefined,
        deliveryMode,
      });

      if (!result.success) {
        setError(result.error ?? "L'émission de la carte a échoué.");
        return;
      }

      setNotice(
        result.warning
          ? `${result.warning} Code : ${result.data?.code}`
          : `Carte ${result.data?.code} émise.`,
      );
      setBuyerName("");
      setBuyerEmail("");
      setBeneficiaryName("");
      setBeneficiaryEmail("");
      setPersonalMessage("");
      router.refresh();
    });
  };

  return (
    <section className="mb-10 rounded-lg border p-5">
      <h2 className="mb-4 font-serif text-lg font-semibold text-primary-green">
        Émettre une carte
      </h2>

      <div className="space-y-4">
        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={type === "amount"}
              onChange={() => setType("amount")}
            />
            Montant
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={type === "service"}
              onChange={() => setType("service")}
              disabled={consultationTypes.length === 0}
            />
            Prestation
          </label>
        </div>

        {type === "amount" ? (
          <div className="flex gap-2">
            {AMOUNTS_CENTS.map((cents) => (
              <button
                key={cents}
                type="button"
                onClick={() => setAmountCents(cents)}
                className={`rounded-md border px-4 py-2 ${
                  amountCents === cents
                    ? "border-primary-red bg-primary-red/5 font-medium"
                    : "border-muted"
                }`}
              >
                {(cents / 100).toFixed(0)} €
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="gift-card-consultation-type">Prestation offerte</Label>
            <select
              id="gift-card-consultation-type"
              value={consultationTypeId}
              onChange={(e) => setConsultationTypeId(e.target.value)}
              className="w-full rounded-md border p-2"
            >
              {consultationTypes.map((ct) => (
                <option key={ct.id} value={ct.id}>
                  {ct.title} — {(ct.priceCents / 100).toFixed(0)} €
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="gift-card-buyer-name">Nom</Label>
            <Input
              id="gift-card-buyer-name"
              value={buyerName}
              onChange={(e) => setBuyerName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gift-card-buyer-email">Email</Label>
            <Input
              id="gift-card-buyer-email"
              type="email"
              value={buyerEmail}
              onChange={(e) => setBuyerEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gift-card-beneficiary-name">
              Bénéficiaire <span className="text-muted-foreground">(optionnel)</span>
            </Label>
            <Input
              id="gift-card-beneficiary-name"
              value={beneficiaryName}
              onChange={(e) => setBeneficiaryName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gift-card-beneficiary-email">
              Email du bénéficiaire{" "}
              <span className="text-muted-foreground">(optionnel)</span>
            </Label>
            <Input
              id="gift-card-beneficiary-email"
              type="email"
              value={beneficiaryEmail}
              onChange={(e) => setBeneficiaryEmail(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="gift-card-message">
            Message personnalisé <span className="text-muted-foreground">(optionnel)</span>
          </Label>
          <textarea
            id="gift-card-message"
            value={personalMessage}
            onChange={(e) => setPersonalMessage(e.target.value)}
            className="w-full rounded-md border p-2"
            rows={3}
          />
        </div>

        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={deliveryMode === "email"}
              onChange={() => setDeliveryMode("email")}
            />
            Envoi par email
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={deliveryMode === "pdf"}
              onChange={() => setDeliveryMode("pdf")}
            />
            PDF imprimable
          </label>
        </div>

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p className="text-sm text-primary-green" role="status">
            {notice}
          </p>
        )}

        <Button
          onClick={handleSubmit}
          disabled={isPending}
          className="bg-primary-green hover:bg-primary-green/90"
        >
          {isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
          Émettre la carte
        </Button>
      </div>
    </section>
  );
};
