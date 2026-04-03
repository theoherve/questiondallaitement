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
import { Building2, Home, Loader2, Video } from "lucide-react";
import { updateLocationConfig, type LocationConfigFormData } from "../actions";
import type { ConsultationLocation, LocationConfig } from "@/types/database";

const ICONS: Record<ConsultationLocation, React.ReactNode> = {
  cabinet: <Building2 className="h-5 w-5" />,
  teleconsultation: <Video className="h-5 w-5" />,
  domicile: <Home className="h-5 w-5" />,
};

type Props = {
  locationConfigs: LocationConfig[];
};

export const LocationConfigsSection = ({ locationConfigs }: Props) => {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleSave = (
    locationType: ConsultationLocation,
    form: HTMLFormElement
  ) => {
    const formData = new FormData(form);
    setMessage(null);

    const data: LocationConfigFormData = {
      label: (formData.get("label") as string) ?? "",
      description: (formData.get("description") as string) ?? "",
      address: (formData.get("address") as string) ?? "",
      city: (formData.get("city") as string) ?? "",
      postal_code: (formData.get("postal_code") as string) ?? "",
      is_active: formData.get("is_active") === "on",
    };

    startTransition(async () => {
      const result = await updateLocationConfig(locationType, data);
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
          Lieux de consultation
        </h2>
        <p className="text-sm text-muted-foreground">
          Configurez les lieux disponibles dans le tunnel de réservation. Seuls
          les lieux actifs ici ET proposés par au moins une consultante
          s&apos;affichent aux clientes.
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

      {locationConfigs.map((config) => (
        <Card key={config.location_type}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="text-primary-green/70">
                {ICONS[config.location_type]}
              </div>
              <div>
                <CardTitle className="text-base">{config.label}</CardTitle>
                <CardDescription>{config.description}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSave(config.location_type, e.currentTarget);
              }}
              className="space-y-4"
            >
              <div className="flex items-center gap-3">
                <Switch
                  id={`active-${config.location_type}`}
                  name="is_active"
                  defaultChecked={config.is_active}
                />
                <Label htmlFor={`active-${config.location_type}`}>
                  Actif dans le tunnel de réservation
                </Label>
              </div>

              <div className="space-y-2">
                <Label>Libellé affiché</Label>
                <Input
                  name="label"
                  defaultValue={config.label}
                  placeholder="Ex : Au cabinet"
                />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  name="description"
                  defaultValue={config.description ?? ""}
                  placeholder="Ex : Rendez-vous en personne"
                />
              </div>

              {config.location_type === "cabinet" && (
                <>
                  <div className="space-y-2">
                    <Label>Adresse</Label>
                    <Input
                      name="address"
                      defaultValue={config.address ?? ""}
                      placeholder="Ex : 9 Rue Collette"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Ville</Label>
                      <Input
                        name="city"
                        defaultValue={config.city ?? ""}
                        placeholder="Paris"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Code postal</Label>
                      <Input
                        name="postal_code"
                        defaultValue={config.postal_code ?? ""}
                        placeholder="75017"
                      />
                    </div>
                  </div>
                </>
              )}

              <Button
                type="submit"
                size="sm"
                disabled={isPending}
                className="bg-primary-red hover:bg-primary-red-dark"
              >
                {isPending && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                Enregistrer
              </Button>
            </form>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
