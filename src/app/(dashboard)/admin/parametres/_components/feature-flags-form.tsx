"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2, Save } from "lucide-react";
import { updateFeatureFlagsAction } from "@/lib/settings/feature-flags/actions";
import type { FeatureFlags } from "@/lib/settings/feature-flags/store";

type Props = { flags: FeatureFlags };

export const FeatureFlagsForm = ({ flags }: Props) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [bookingEnabled, setBookingEnabled] = useState(flags.booking_enabled);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    startTransition(async () => {
      const result = await updateFeatureFlagsAction({ booking_enabled: bookingEnabled });
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
          <CardTitle className="text-primary-green">Réservation de rendez-vous</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="font-medium">Activer la réservation de rendez-vous</p>
              <p className="text-sm text-muted-foreground">
                Désactivé : les CTA et menus « Prendre rendez-vous » disparaissent du site, le
                mode devient formations uniquement.
              </p>
            </div>
            <Switch
              checked={bookingEnabled}
              onCheckedChange={setBookingEnabled}
              aria-label="Activer la réservation de rendez-vous"
            />
          </div>

          {error && (
            <p className="text-sm font-medium text-destructive" role="alert">
              {error}
            </p>
          )}
          {success && (
            <p className="text-sm font-medium text-green-600" role="status">
              Feature flags enregistrés.
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
            Enregistrer
          </Button>
        </CardContent>
      </Card>
    </form>
  );
};
