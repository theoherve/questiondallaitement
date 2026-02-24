"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, AlertTriangle } from "lucide-react";
import {
  updatePlatformSettings,
  type PlatformSettings,
} from "../actions";

type SettingsFormProps = {
  settings: PlatformSettings;
};

export const SettingsForm = ({ settings }: SettingsFormProps) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [commissionRate, setCommissionRate] = useState(
    settings.default_commission_rate
  );
  const [thresholdHours, setThresholdHours] = useState(
    settings.cancellation_threshold_hours
  );
  const [penaltyRate, setPenaltyRate] = useState(
    settings.cancellation_penalty_rate
  );
  const [platformName, setPlatformName] = useState(settings.platform_name);
  const [maintenanceMode, setMaintenanceMode] = useState(
    settings.maintenance_mode
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    startTransition(async () => {
      const result = await updatePlatformSettings({
        default_commission_rate: commissionRate,
        cancellation_threshold_hours: thresholdHours,
        cancellation_penalty_rate: penaltyRate,
        platform_name: platformName,
        maintenance_mode: maintenanceMode,
      });

      if (!result.success) {
        setError(result.error ?? "Erreur inconnue");
        return;
      }

      setSuccess(true);
      router.refresh();
      setTimeout(() => setSuccess(false), 3000);
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-primary-green">Général</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="platform_name">Nom de la plateforme</Label>
            <Input
              id="platform_name"
              value={platformName}
              onChange={(e) => setPlatformName(e.target.value)}
              required
              aria-label="Nom de la plateforme"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-primary-green">Commissions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="commission_rate">
              Taux de commission par défaut (%)
            </Label>
            <Input
              id="commission_rate"
              type="number"
              min={0}
              max={100}
              step={0.01}
              value={commissionRate}
              onChange={(e) => setCommissionRate(Number(e.target.value))}
              aria-label="Taux de commission par défaut"
            />
            <p className="text-xs text-muted-foreground">
              Appliqué aux nouvelles consultantes. Chaque consultante peut avoir
              un taux personnalisé dans sa fiche.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-primary-green">
            Politique d&apos;annulation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="threshold_hours">
              Seuil d&apos;annulation gratuite (heures)
            </Label>
            <Input
              id="threshold_hours"
              type="number"
              min={0}
              step={1}
              value={thresholdHours}
              onChange={(e) => setThresholdHours(Number(e.target.value))}
              aria-label="Seuil d'annulation en heures"
            />
            <p className="text-xs text-muted-foreground">
              Annulation gratuite si effectuée au moins {thresholdHours}h avant
              le rendez-vous. Pénalité appliquée en dessous.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="penalty_rate">
              Taux de pénalité en cas d&apos;annulation tardive
            </Label>
            <Input
              id="penalty_rate"
              type="number"
              min={0}
              max={1}
              step={0.01}
              value={penaltyRate}
              onChange={(e) => setPenaltyRate(Number(e.target.value))}
              aria-label="Taux de pénalité"
            />
            <p className="text-xs text-muted-foreground">
              Valeur entre 0 et 1 (ex : 0.50 = 50% du montant retenu).
              Actuellement : {(penaltyRate * 100).toFixed(0)}%.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className={maintenanceMode ? "border-amber-400" : ""}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary-green">
            Mode maintenance
            {maintenanceMode && (
              <Badge variant="destructive" className="ml-2">
                Actif
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="font-medium">Activer le mode maintenance</p>
              <p className="text-sm text-muted-foreground">
                Les pages publiques afficheront un message de maintenance.
                L&apos;admin reste accessible.
              </p>
            </div>
            <Switch
              checked={maintenanceMode}
              onCheckedChange={setMaintenanceMode}
              aria-label="Activer ou désactiver le mode maintenance"
            />
          </div>

          {maintenanceMode && (
            <div className="flex items-start gap-3 rounded-lg border-2 border-dashed border-amber-400 bg-amber-50 p-4">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <div>
                <p className="font-medium text-amber-800">
                  Attention : le site sera inaccessible au public
                </p>
                <p className="text-sm text-amber-600">
                  Toutes les pages publiques (accueil, formations, consultantes,
                  etc.) afficheront une page de maintenance. Seul le backoffice
                  admin restera accessible.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {error && (
        <p className="text-sm font-medium text-destructive" role="alert">
          {error}
        </p>
      )}

      {success && (
        <p
          className="text-sm font-medium text-green-600"
          role="status"
        >
          Paramètres enregistrés avec succès.
        </p>
      )}

      <Button
        type="submit"
        disabled={isPending}
        className="bg-primary-red hover:bg-primary-red-dark"
      >
        {isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Save className="mr-2 h-4 w-4" />
        )}
        Enregistrer les paramètres
      </Button>
    </form>
  );
};
