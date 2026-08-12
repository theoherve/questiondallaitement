"use client";

import { useState } from "react";
import { purchaseGiftCard } from "./actions";

const AMOUNTS_CENTS = [9000, 13000, 17000];

export default function GiftCardPurchasePage() {
  const [amountCents, setAmountCents] = useState(AMOUNTS_CENTS[0]);
  const [buyerName, setBuyerName] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [beneficiaryName, setBeneficiaryName] = useState("");
  const [beneficiaryEmail, setBeneficiaryEmail] = useState("");
  const [personalMessage, setPersonalMessage] = useState("");
  const [deliveryMode, setDeliveryMode] = useState<"email" | "pdf">("email");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const handleSubmit = async () => {
    setPending(true);
    setError(null);
    const result = await purchaseGiftCard({
      type: "amount",
      amountCents,
      buyerName,
      buyerEmail,
      beneficiaryName: beneficiaryName || undefined,
      beneficiaryEmail: beneficiaryEmail || undefined,
      personalMessage: personalMessage || undefined,
      deliveryMode,
    });
    setPending(false);
    if (!result.success || !result.data) {
      setError(result.error ?? "Une erreur est survenue.");
      return;
    }
    window.location.href = result.data.checkoutUrl;
  };

  return (
    <main className="mx-auto max-w-xl px-4 py-12">
      <h1 className="mb-6 text-2xl font-semibold">Offrir une carte cadeau</h1>
      <div className="space-y-4">
        <div className="flex gap-2">
          {AMOUNTS_CENTS.map((cents) => (
            <button
              key={cents}
              type="button"
              onClick={() => setAmountCents(cents)}
              className={amountCents === cents ? "border-2 border-primary p-2" : "border p-2"}
            >
              {(cents / 100).toFixed(0)} €
            </button>
          ))}
        </div>
        <input
          value={buyerName}
          onChange={(e) => setBuyerName(e.target.value)}
          placeholder="Votre nom"
          className="w-full border p-2"
        />
        <input
          value={buyerEmail}
          onChange={(e) => setBuyerEmail(e.target.value)}
          placeholder="Votre email"
          className="w-full border p-2"
        />
        <input
          value={beneficiaryName}
          onChange={(e) => setBeneficiaryName(e.target.value)}
          placeholder="Nom du/de la bénéficiaire (optionnel)"
          className="w-full border p-2"
        />
        <input
          value={beneficiaryEmail}
          onChange={(e) => setBeneficiaryEmail(e.target.value)}
          placeholder="Email du/de la bénéficiaire (optionnel)"
          className="w-full border p-2"
        />
        <textarea
          value={personalMessage}
          onChange={(e) => setPersonalMessage(e.target.value)}
          placeholder="Message personnalisé (optionnel)"
          className="w-full border p-2"
        />
        <div className="flex gap-4">
          <label>
            <input
              type="radio"
              checked={deliveryMode === "email"}
              onChange={() => setDeliveryMode("email")}
            />
            {" "}Envoi par email
          </label>
          <label>
            <input
              type="radio"
              checked={deliveryMode === "pdf"}
              onChange={() => setDeliveryMode("pdf")}
            />
            {" "}PDF imprimable
          </label>
        </div>
        {error && <p className="text-red-600">{error}</p>}
        <button
          type="button"
          disabled={pending}
          onClick={handleSubmit}
          className="w-full bg-primary p-3 text-white"
        >
          {pending ? "Redirection…" : "Payer"}
        </button>
      </div>
    </main>
  );
}
