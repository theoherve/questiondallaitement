"use client";

import { CreditCard, Banknote } from "lucide-react";
import type {
  BookingPaymentMethod,
  ConsultationLocation,
} from "@/types/database";

type StepPaymentProps = {
  priceCents: number;
  currency: string;
  /**
   * `createBooking` refuse le paiement sur place en teleconsultation : il n'y a
   * pas de « place » ou regler. Sans ce filtre l'option restait proposee, et la
   * cliente ne decouvrait le refus qu'a la derniere etape, apres avoir tout
   * saisi.
   */
  location: ConsultationLocation | null;
  selected: BookingPaymentMethod | null;
  onSelect: (method: BookingPaymentMethod) => void;
};

const formatPrice = (cents: number, currency: string): string =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(
    cents / 100
  );

const PAYMENT_OPTIONS: {
  value: BookingPaymentMethod;
  label: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    value: "online",
    label: "Paiement en ligne",
    description: "Paiement sécurisé par carte bancaire via Stripe",
    icon: <CreditCard className="h-8 w-8" />,
  },
  {
    value: "on_site",
    label: "Paiement sur place",
    description: "Réglez directement lors de votre rendez-vous (espèces ou CB)",
    icon: <Banknote className="h-8 w-8" />,
  },
];

export const StepPayment = ({
  priceCents,
  currency,
  location,
  selected,
  onSelect,
}: StepPaymentProps) => {
  const options = PAYMENT_OPTIONS.filter(
    (option) =>
      option.value !== "on_site" || location !== "teleconsultation",
  );

  return (
  <div className="space-y-4">
    <h2 className="font-serif text-xl font-semibold text-primary-green">
      Comment souhaitez-vous régler ?
    </h2>

    <p className="text-lg font-bold text-primary-green">
      Montant total : {formatPrice(priceCents, currency)}
    </p>

    <div className="grid gap-3 sm:grid-cols-2">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          data-testid="step-payment-option"
          data-payment-method={option.value}
          onClick={() => onSelect(option.value)}
          className={`cursor-pointer flex flex-col items-center gap-3 rounded-lg border-2 p-6 text-center transition-all hover:border-primary-red hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-red/50 ${
            selected === option.value
              ? "border-primary-red bg-primary-red/5"
              : "border-muted"
          }`}
          tabIndex={0}
          aria-label={`Sélectionner ${option.label}`}
        >
          <div className="text-primary-green/70">{option.icon}</div>
          <div>
            <p className="font-medium text-primary-green">{option.label}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {option.description}
            </p>
          </div>
        </button>
      ))}
    </div>
  </div>
  );
};
