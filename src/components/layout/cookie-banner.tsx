"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useCookieConsent, type ConsentState } from "@/hooks/use-cookie-consent";

export const CookieBanner = () => {
  const { hasAnswered, acceptAll, rejectAll, saveCustom } = useCookieConsent();
  const [customOpen, setCustomOpen] = useState(false);
  const [custom, setCustom] = useState<ConsentState>({
    analytics: false,
    marketing: false,
  });

  if (hasAnswered) return null;

  return (
    <div
      role="dialog"
      aria-label="Gestion des cookies"
      aria-modal="false"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background-beige px-5 py-4 shadow-lg sm:px-8"
    >
      <div className="mx-auto max-w-7xl">
        {!customOpen ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-primary-green/80">
              Nous utilisons des cookies pour mesurer l&apos;audience de notre
              site (Vercel Speed Insights). Aucun cookie publicitaire tiers
              n&apos;est déposé sans votre accord.{" "}
              <button
                type="button"
                onClick={() => setCustomOpen(true)}
                className="underline underline-offset-2 hover:text-primary-red"
              >
                Personnaliser
              </button>
            </p>
            <div className="flex shrink-0 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={rejectAll}
                className="border-primary-green/30 text-primary-green hover:border-primary-green hover:bg-transparent"
              >
                Refuser
              </Button>
              <Button
                size="sm"
                onClick={acceptAll}
                className="bg-primary-red hover:bg-primary-red-dark"
              >
                Tout accepter
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-sm font-medium text-primary-green">
              Personnaliser les cookies
            </p>

            <div className="flex flex-col gap-3">
              {/* Nécessaires — toujours actifs */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-primary-green">
                    Cookies nécessaires
                  </p>
                  <p className="text-xs text-primary-green/60">
                    Session, authentification, préférences. Indispensables au
                    fonctionnement du site.
                  </p>
                </div>
                <Switch checked disabled aria-label="Cookies nécessaires (toujours actifs)" />
              </div>

              {/* Analytics */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-primary-green">
                    Cookies analytiques
                  </p>
                  <p className="text-xs text-primary-green/60">
                    Vercel Speed Insights — mesure anonymisée des performances
                    du site.
                  </p>
                </div>
                <Switch
                  checked={custom.analytics}
                  onCheckedChange={(v) =>
                    setCustom((prev) => ({ ...prev, analytics: v }))
                  }
                  aria-label="Cookies analytiques"
                />
              </div>

              {/* Marketing */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-primary-green">
                    Cookies marketing
                  </p>
                  <p className="text-xs text-primary-green/60">
                    Publicité personnalisée et réseaux sociaux. Non utilisés
                    actuellement.
                  </p>
                </div>
                <Switch
                  checked={custom.marketing}
                  onCheckedChange={(v) =>
                    setCustom((prev) => ({ ...prev, marketing: v }))
                  }
                  aria-label="Cookies marketing"
                />
              </div>
            </div>

            <div className="flex gap-2 self-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCustomOpen(false)}
                className="border-primary-green/30 text-primary-green hover:border-primary-green hover:bg-transparent"
              >
                Retour
              </Button>
              <Button
                size="sm"
                onClick={() => saveCustom(custom)}
                className="bg-primary-red hover:bg-primary-red-dark"
              >
                Enregistrer
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
