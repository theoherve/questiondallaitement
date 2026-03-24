"use client";

import { useEffect, useState } from "react";
import { Clock, CreditCard, Info, Loader2 } from "lucide-react";
import { getDurationsForService } from "../actions";

type DurationOption = {
  duration_minutes: number;
  min_price_cents: number;
  max_price_cents: number;
  currency: string;
};

type StepDurationProps = {
  serviceTitle: string;
  selectedDuration: number | null;
  onSelect: (durationMinutes: number) => void;
};

const formatPrice = (cents: number, currency: string): string =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(
    cents / 100
  );

const formatDuration = (minutes: number): string => {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h}h`;
  return `${h}h${m.toString().padStart(2, "0")}`;
};

export const StepDuration = ({
  serviceTitle,
  selectedDuration,
  onSelect,
}: StepDurationProps) => {
  const [durations, setDurations] = useState<DurationOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const data = await getDurationsForService(serviceTitle);
      setDurations(data);
      setIsLoading(false);
    };
    load();
  }, [serviceTitle]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary-green/50" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="font-serif text-xl font-semibold text-primary-green">
        Quelle durée souhaitez-vous ?
      </h2>

      <div className="grid gap-3 sm:grid-cols-2">
        {durations.map((d) => (
          <button
            key={d.duration_minutes}
            type="button"
            onClick={() => onSelect(d.duration_minutes)}
            className={`cursor-pointer rounded-lg border-2 p-4 text-left transition-all hover:border-primary-red hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-red/50 ${
              selectedDuration === d.duration_minutes
                ? "border-primary-red bg-primary-red/5"
                : "border-muted"
            }`}
            aria-label={`Sélectionner ${formatDuration(d.duration_minutes)}`}
          >
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary-green/70" />
              <span className="text-lg font-medium text-primary-green">
                {formatDuration(d.duration_minutes)}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-1 text-sm text-primary-green/70">
              <CreditCard className="h-3.5 w-3.5" />
              {d.min_price_cents === d.max_price_cents ? (
                <span>
                  À partir de {formatPrice(d.min_price_cents, d.currency)}
                </span>
              ) : (
                <span>
                  De {formatPrice(d.min_price_cents, d.currency)} à{" "}
                  {formatPrice(d.max_price_cents, d.currency)}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>

      <div className="flex items-start gap-2 rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>
          Tarif différent les week-ends et jours fériés (110 €/h). Le prix
          définitif sera calculé après le choix du créneau.
        </span>
      </div>

      {durations.length === 0 && (
        <p className="py-8 text-center text-muted-foreground">
          Aucune durée disponible pour ce service.
        </p>
      )}
    </div>
  );
};
