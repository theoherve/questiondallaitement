"use client";

import { Building2, Video, Home } from "lucide-react";
import type { ConsultationLocation } from "@/types/database";

type StepLocationProps = {
  availableLocations: string[];
  selected: ConsultationLocation | null;
  onSelect: (location: ConsultationLocation) => void;
};

const LOCATION_CONFIG: Record<
  string,
  { label: string; description: string; icon: React.ReactNode }
> = {
  cabinet: {
    label: "Au cabinet",
    description: "Rendez-vous en personne au cabinet de la consultante",
    icon: <Building2 className="h-8 w-8" />,
  },
  teleconsultation: {
    label: "Téléconsultation",
    description: "Rendez-vous en visio depuis chez vous",
    icon: <Video className="h-8 w-8" />,
  },
  domicile: {
    label: "À domicile",
    description: "La consultante se déplace chez vous (supplément possible)",
    icon: <Home className="h-8 w-8" />,
  },
};

export const StepLocation = ({
  availableLocations,
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
          const config = LOCATION_CONFIG[loc];
          return (
            <button
              key={loc}
              type="button"
              onClick={() => onSelect(loc)}
              className={`flex flex-col items-center gap-3 rounded-lg border-2 p-6 text-center transition-all hover:border-primary-red hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-red/50 ${
                selected === loc
                  ? "border-primary-red bg-primary-red/5"
                  : "border-muted"
              }`}
              tabIndex={0}
              aria-label={`Sélectionner ${config.label}`}
            >
              <div className="text-primary-green/70">{config.icon}</div>
              <div>
                <p className="font-medium text-primary-green">{config.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {config.description}
                </p>
              </div>
            </button>
          );
        })}
    </div>
  </div>
);
