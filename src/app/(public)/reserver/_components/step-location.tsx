"use client";

import { Building2, Video, Home } from "lucide-react";
import type { ConsultationLocation, LocationConfig } from "@/types/database";

const LOCATION_ICONS: Record<string, React.ReactNode> = {
  cabinet: <Building2 className="h-8 w-8" />,
  teleconsultation: <Video className="h-8 w-8" />,
  domicile: <Home className="h-8 w-8" />,
};

// Fallback labels if location_configs not available
const FALLBACK: Record<string, { label: string; description: string }> = {
  cabinet: {
    label: "Au cabinet",
    description: "Rendez-vous en personne au cabinet",
  },
  teleconsultation: {
    label: "Téléconsultation",
    description: "Rendez-vous en visio depuis chez vous",
  },
  domicile: {
    label: "À domicile",
    description: "La consultante se déplace chez vous (supplément possible)",
  },
};

type StepLocationProps = {
  availableLocations: string[];
  locationConfigs: LocationConfig[];
  selected: ConsultationLocation | null;
  onSelect: (location: ConsultationLocation) => void;
};

export const StepLocation = ({
  availableLocations,
  locationConfigs,
  selected,
  onSelect,
}: StepLocationProps) => (
  <div className="space-y-4">
    <h2 className="font-serif text-xl font-semibold text-primary-green">
      Où souhaitez-vous consulter ?
    </h2>
    <div className="grid gap-3 sm:grid-cols-3">
      {(["cabinet", "teleconsultation", "domicile"] as const)
        .filter((loc) => availableLocations.includes(loc))
        .map((loc) => {
          const config = locationConfigs.find((c) => c.location_type === loc);
          const label = config?.label ?? FALLBACK[loc].label;
          const description = config?.description ?? FALLBACK[loc].description;

          return (
            <button
              key={loc}
              type="button"
              onClick={() => onSelect(loc)}
              className={`cursor-pointer flex flex-col items-center gap-3 rounded-lg border-2 p-6 text-center transition-all hover:border-primary-red hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-red/50 ${
                selected === loc
                  ? "border-primary-red bg-primary-red/5"
                  : "border-muted"
              }`}
              tabIndex={0}
              aria-label={`Sélectionner ${label}`}
            >
              <div className="text-primary-green/70">{LOCATION_ICONS[loc]}</div>
              <div>
                <p className="font-medium text-primary-green">{label}</p>
                <p className="mt-1 text-xs text-muted-foreground">{description}</p>
              </div>
            </button>
          );
        })}
    </div>
  </div>
);
