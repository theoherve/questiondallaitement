"use client";

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
  onSelect: (title: string) => void;
};

export const StepService = ({ services, selected, onSelect }: StepServiceProps) => {
  // Deduplicate by title for display
  const uniqueTitles = Array.from(
    new Map(services.map((s) => [s.title, s])).values()
  );

  return (
    <div className="space-y-4">
      <h2 className="font-serif text-xl font-semibold text-primary-green">
        Quel type de consultation souhaitez-vous ?
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {uniqueTitles.map((service) => (
          <button
            key={service.title}
            type="button"
            data-testid="step-service-option"
            data-service={service.title}
            onClick={() => onSelect(service.title)}
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
};