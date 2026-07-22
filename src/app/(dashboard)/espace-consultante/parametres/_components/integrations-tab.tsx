"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, ExternalLink, Video, ShieldCheck } from "lucide-react";

type IntegrationsTabProps = {
  stripeStatus: string;
  zoomConnected: boolean;
  zoomAuthUrl: string;
  /** La consultante est la proprietaire de la plateforme (encaissement direct). */
  isPlatformOwner?: boolean;
};

export const IntegrationsTab = ({
  stripeStatus,
  zoomConnected,
  zoomAuthUrl,
  isPlatformOwner = false,
}: IntegrationsTabProps) => (
  <div className="space-y-4">
    <div>
      <h2 className="font-serif text-lg font-semibold text-primary-green">
        Intégrations
      </h2>
      <p className="text-sm text-muted-foreground">
        Connectez vos services externes.
      </p>
    </div>

    <Card>
      <CardHeader>
        <CardTitle className="text-base">Stripe Connect</CardTitle>
        <CardDescription>
          {isPlatformOwner
            ? "Encaissement des paiements en ligne"
            : "Connectez votre compte Stripe pour recevoir vos paiements"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isPlatformOwner ? (
          // La proprietaire de la plateforme encaisse directement : router ses
          // ventes vers un compte Connect serait un aller-retour inutile (voir
          // sale-routing.ts). Aucun onboarding Stripe a lui faire faire — on le
          // dit clairement plutot que de lui montrer un « Connecter Stripe » qui
          // n'aurait pas de sens et laisserait son integration « incomplete ».
          <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-900">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-green-700" />
            <div className="space-y-1">
              <p className="font-medium">
                Vous êtes propriétaire de la plateforme
              </p>
              <p>
                Vos paiements en ligne sont encaissés directement par la
                plateforme, sans commission. Aucun compte Stripe Connect à
                raccorder : votre configuration est complète.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm">Statut :</span>
              <Badge
                variant={stripeStatus === "active" ? "default" : "secondary"}
              >
                {stripeStatus === "active"
                  ? "Actif"
                  : stripeStatus === "pending_verification"
                    ? "Vérification en cours"
                    : "Non connecté"}
              </Badge>
            </div>
            {stripeStatus === "active" ? (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle className="h-4 w-4" />
                Connecté
              </div>
            ) : (
              <Button variant="outline" size="sm" asChild>
                <a href="/api/stripe/connect" tabIndex={0}>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Connecter Stripe
                </a>
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle className="text-base">Zoom</CardTitle>
        <CardDescription>
          Connectez Zoom pour la création automatique de réunions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Video className="h-4 w-4" />
            <span className="text-sm">
              {zoomConnected ? "Zoom connecté" : "Non connecté"}
            </span>
          </div>
          {zoomConnected ? (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle className="h-4 w-4" />
              Connecté
            </div>
          ) : (
            <Button variant="outline" size="sm" asChild>
              <a href={zoomAuthUrl} tabIndex={0}>
                <ExternalLink className="mr-2 h-4 w-4" />
                Connecter Zoom
              </a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  </div>
);
