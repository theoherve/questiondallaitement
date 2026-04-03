"use client";

import { useState, useTransition } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Building2, Home, Loader2, MapPin, Video } from "lucide-react";
import { upsertLocation, type LocationFormData } from "../actions";
import type { ConsultationLocation, LocationConfig } from "@/types/database";

type Location = {
  id: string;
  location_type: string;
  label: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  radius_km: number | null;
  surcharge_cents: number;
  is_active: boolean;
};

type LocationsTabProps = {
  locations: Location[];
  locationConfigs: LocationConfig[];
};

const ICONS: Record<ConsultationLocation, React.ReactNode> = {
  cabinet: <Building2 className="h-5 w-5" />,
  teleconsultation: <Video className="h-5 w-5" />,
  domicile: <Home className="h-5 w-5" />,
};

const LOCATION_TYPES: ConsultationLocation[] = ["cabinet", "teleconsultation", "domicile"];

export const LocationsTab = ({ locations, locationConfigs }: LocationsTabProps) => {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const getExisting = (type: string) =>
    locations.find((l) => l.location_type === type);

  const getConfig = (type: ConsultationLocation) =>
    locationConfigs.find((c) => c.location_type === type);

  const handleSave = (type: ConsultationLocation, form: HTMLFormElement) => {
    const formData = new FormData(form);
    setMessage(null);

    const data: LocationFormData = {
      location_type: type,
      label: (formData.get("label") as string) ?? "",
      address: (formData.get("address") as string) ?? "",
      city: (formData.get("city") as string) ?? "",
      postal_code: (formData.get("postal_code") as string) ?? "",
      radius_km: formData.get("radius_km")
        ? Number(formData.get("radius_km"))
        : null,
      surcharge_cents: formData.get("surcharge_cents")
        ? Number(formData.get("surcharge_cents"))
        : 0,
      is_active: formData.get("is_active") === "on",
    };

    startTransition(async () => {
      const result = await upsertLocation(data);
      setMessage(
        result.success
          ? { type: "success", text: "Lieu mis à jour" }
          : { type: "error", text: result.error ?? "Erreur" }
      );
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-serif text-lg font-semibold text-primary-green">
          Configuration des lieux
        </h2>
        <p className="text-sm text-muted-foreground">
          Activez les lieux où vous proposez des consultations.
        </p>
      </div>

      {message && (
        <p
          className={`text-sm ${message.type === "success" ? "text-green-600" : "text-destructive"}`}
          role="alert"
        >
          {message.text}
        </p>
      )}

      {LOCATION_TYPES.map((locationType) => {
        const existing = getExisting(locationType);
        const globalConfig = getConfig(locationType);

        return (
          <Card key={locationType}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-primary-green/70">{ICONS[locationType]}</div>
                  <div>
                    <CardTitle className="text-base">
                      {globalConfig?.label ?? locationType}
                    </CardTitle>
                    <CardDescription>{globalConfig?.description}</CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSave(locationType, e.currentTarget);
                }}
                className="space-y-4"
              >
                <div className="flex items-center gap-3">
                  <Switch
                    id={`active-${locationType}`}
                    name="is_active"
                    defaultChecked={existing?.is_active ?? false}
                  />
                  <Label htmlFor={`active-${locationType}`}>Actif</Label>
                </div>

                {/* Cabinet: show global address (read-only), no editable fields */}
                {locationType === "cabinet" && globalConfig?.address && (
                  <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    <span>
                      {globalConfig.address}
                      {globalConfig.city && `, ${globalConfig.city}`}
                      {globalConfig.postal_code && ` ${globalConfig.postal_code}`}
                    </span>
                  </div>
                )}

                {/* Domicile: keep specific fields */}
                {locationType === "domicile" && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Ville</Label>
                        <Input
                          name="city"
                          defaultValue={existing?.city ?? ""}
                          placeholder="Ville de départ"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Rayon (km)</Label>
                        <Input
                          name="radius_km"
                          type="number"
                          min={0}
                          defaultValue={existing?.radius_km ?? ""}
                          placeholder="Ex : 20"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Supplément domicile (centimes)</Label>
                      <Input
                        name="surcharge_cents"
                        type="number"
                        min={0}
                        step={100}
                        defaultValue={existing?.surcharge_cents ?? 0}
                      />
                      <p className="text-xs text-muted-foreground">
                        En centimes. Ex : 2000 = 20€ de supplément
                      </p>
                    </div>
                  </>
                )}

                <Button
                  type="submit"
                  size="sm"
                  disabled={isPending}
                  className="bg-primary-red hover:bg-primary-red-dark"
                >
                  {isPending && (
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  )}
                  Enregistrer
                </Button>
              </form>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
