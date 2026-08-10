"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  isPushSupported,
  subscribeThisDevice,
} from "@/lib/notifications/push/client";
import { registerPushSubscription, removePushDevice } from "../push-actions";
import type { PushDevice } from "@/types/database";

type Props = {
  devices: PushDevice[];
  publicKey: string;
  /** Rafraîchit la page serveur pour que la colonne push cesse d'être grisée. */
  onSubscribed: () => Promise<void>;
};

/** Nom lisible d'un appareil, à partir de son `user_agent`. */
const deviceLabel = (userAgent: string | null): string => {
  if (!userAgent) return "Appareil inconnu";
  if (/iphone/i.test(userAgent)) return "iPhone";
  if (/ipad/i.test(userAgent)) return "iPad";
  if (/android/i.test(userAgent)) return "Téléphone Android";
  if (/macintosh/i.test(userAgent)) return "Mac";
  if (/windows/i.test(userAgent)) return "Ordinateur Windows";
  return "Navigateur";
};

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

/**
 * Seule porte d'abonnement du site. L'autorisation n'est demandée que sur clic
 * délibéré : une demande surgie sans geste préalable se fait refuser
 * massivement, et un refus est définitif côté navigateur.
 */
export const PushActivation = ({ devices, publicKey, onSubscribed }: Props) => {
  const [permission, setPermission] = useState<
    NotificationPermission | "unsupported"
  >("default");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPermission(isPushSupported() ? Notification.permission : "unsupported");
  }, []);

  const activate = async () => {
    setPending(true);
    setError(null);
    try {
      const subscription = await subscribeThisDevice(publicKey);
      const result = await registerPushSubscription(subscription);
      if (!result.success) {
        setError(result.error ?? "L'activation a échoué.");
        return;
      }
      setPermission(Notification.permission);
      await onSubscribed();
    } catch {
      setPermission(isPushSupported() ? Notification.permission : "unsupported");
      setError("L'activation a échoué sur cet appareil.");
    } finally {
      setPending(false);
    }
  };

  const remove = async (endpoint: string) => {
    await removePushDevice(endpoint);
    await onSubscribed();
  };

  if (permission === "unsupported") {
    return (
      <p className="text-xs text-muted-foreground">
        Ce navigateur ne gère pas les notifications sur l&apos;appareil.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {permission === "denied" ? (
        <p className="text-xs text-muted-foreground">
          Les notifications sont bloquées pour ce site. Le blocage se lève dans
          les réglages de votre navigateur, à la rubrique des notifications.
        </p>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={activate}
          className="border-primary-green/30 text-primary-green hover:border-primary-green hover:bg-transparent"
        >
          {pending ? "Activation..." : "Activer sur cet appareil"}
        </Button>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}

      {devices.length > 0 && (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {devices.map((device) => (
            <li
              key={device.endpoint}
              className="flex items-center justify-between gap-4 px-3 py-2"
            >
              <div>
                <p className="text-sm">{deviceLabel(device.user_agent)}</p>
                <p className="text-xs text-muted-foreground">
                  Ajouté le {formatDate(device.created_at)}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => remove(device.endpoint)}
              >
                Retirer
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
