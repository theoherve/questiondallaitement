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
import { CheckCircle, ExternalLink, Video } from "lucide-react";

type IntegrationsTabProps = {
  stripeStatus: string;
  zoomConnected: boolean;
  zoomAuthUrl: string;
};

export const IntegrationsTab = ({
  stripeStatus,
  zoomConnected,
  zoomAuthUrl,
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
          Connectez votre compte Stripe pour recevoir vos paiements
        </CardDescription>
      </CardHeader>
      <CardContent>
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
