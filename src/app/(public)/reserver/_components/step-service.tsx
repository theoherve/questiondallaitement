"use client";

import { Clock, CreditCard } from "lucide-react";

type ServiceOption = {
  title: string;
  description: string | null;
  duration_minutes: number;
  price_cents: number;
  currency: string;
  available_locations: string[];
};

type StepServiceProps = {
  services: ServiceOption[];
  selected: string | null;
  onSelect: (title: string, priceCents: number, currency: string, durationMinutes: number) => void;
};

const formatPrice = (cents: number, currency: string): string =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(
    cents / 100
  );

export const StepService = ({ services, selected, onSelect }: StepServiceProps) => (
  <div className="space-y-4">
    <h2 className="font-serif text-xl font-semibold text-primary-green">
      Quel type de consultation souhaitez-vous ?
    </h2>
    <div className="grid gap-3 sm:grid-cols-2">
      {services.map((service) => (
        <button
          key={service.title}
          type="button"
          onClick={() =>
            onSelect(
              service.title,
              service.price_cents,
              service.currency,
              service.duration_minutes
            )
          }
          className={`cursor-pointer rounded-lg border-2 p-4 text-left transition-all hover:border-primary-red hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-red/50 ${
            selected === service.title
              ? "border-primary-red bg-primary-red/5"
              : "border-muted"
          }`}
          tabIndex={0}
          aria-label={`Sélectionner ${service.title}`}
        >
          <h3 className="font-medium text-primary-green">{service.title}</h3>
          {service.description && (
            <p className="mt-1 text-sm text-muted-foreground">
              {service.description}
            </p>
          )}
          <div className="mt-3 flex items-center gap-4 text-sm text-primary-green/70">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {service.duration_minutes} min
            </span>
            <span className="flex items-center gap-1">
              <CreditCard className="h-3.5 w-3.5" />
              {formatPrice(service.price_cents, service.currency)}
            </span>
          </div>
        </button>
      ))}
    </div>
    {services.length === 0 && (
      <p className="py-8 text-center text-muted-foreground">
        Aucun service disponible pour le moment.
      </p>
    )}
  </div>
);
