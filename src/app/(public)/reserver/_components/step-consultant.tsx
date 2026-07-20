"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { getConsultantsForService, getConsultationTypeId, getSurcharge, getDurationOptionForConsultant } from "../actions";
import type { ConsultationLocation } from "@/types/database";

type Consultant = {
  id: string;
  slug: string;
  bio: string | null;
  specialties: string[];
  profiles: {
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  } | null;
};

type StepConsultantProps = {
  serviceTitle: string;
  location: ConsultationLocation;
  durationMinutes: number;
  onSelect: (
    consultantId: string,
    consultantName: string,
    consultationTypeId: string,
    surchargeCents: number,
    durationOptionId: string
  ) => void;
};

export const StepConsultant = ({
  serviceTitle,
  location,
  durationMinutes,
  onSelect,
}: StepConsultantProps) => {
  const [consultants, setConsultants] = useState<Consultant[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const data = await getConsultantsForService(serviceTitle, location, durationMinutes);
      setConsultants(
        (data ?? []).map((c) => ({
          id: c.id,
          slug: c.slug,
          bio: c.bio,
          specialties: (c.specialties as string[]) ?? [],
          profiles: c.profiles as unknown as Consultant["profiles"],
        }))
      );
      setIsLoading(false);
    };
    load();
  }, [serviceTitle, location, durationMinutes]);

  const handleSelect = async (consultant: Consultant) => {
    const profile = consultant.profiles;
    const name = profile
      ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim()
      : "Consultante";

    const [typeId, surcharge, durationOption] = await Promise.all([
      getConsultationTypeId(consultant.id, serviceTitle, location),
      getSurcharge(consultant.id, location),
      getDurationOptionForConsultant(consultant.id, serviceTitle, durationMinutes),
    ]);

    if (!typeId || !durationOption) return;
    onSelect(consultant.id, name, typeId, surcharge, durationOption.id);
  };

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
        Choisissez votre consultante
      </h2>
      <div className="space-y-3">
        {consultants.map((consultant) => {
          const profile = consultant.profiles;
          const name = profile
            ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim()
            : "Consultante";

          return (
            <button
              key={consultant.id}
              type="button"
              data-testid="step-consultant-option"
              data-consultant-id={consultant.id}
              onClick={() => handleSelect(consultant)}
              className="cursor-pointer flex w-full items-start gap-4 rounded-lg border-2 border-muted p-4 text-left transition-all hover:border-primary-red hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-red/50"
              tabIndex={0}
              aria-label={`Sélectionner ${name}`}
            >
              {profile?.avatar_url ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={profile.avatar_url}
                  alt={name}
                  className="h-14 w-14 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-green/10 text-lg font-bold text-primary-green">
                  {(profile?.first_name?.[0] ?? "").toUpperCase()}
                  {(profile?.last_name?.[0] ?? "").toUpperCase()}
                </div>
              )}
              <div className="flex-1">
                <p className="font-medium text-primary-green">{name}</p>
                {consultant.bio && (
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {consultant.bio}
                  </p>
                )}
                {consultant.specialties.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {consultant.specialties.slice(0, 3).map((spec) => (
                      <Badge key={spec} variant="secondary" className="text-xs">
                        {spec}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </button>
          );
        })}
        {consultants.length === 0 && (
          <p className="py-8 text-center text-muted-foreground">
            Aucune consultante disponible pour ce service et ce lieu.
          </p>
        )}
      </div>
    </div>
  );
};
