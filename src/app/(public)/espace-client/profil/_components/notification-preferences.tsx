"use client";

import { useState, useTransition } from "react";
import { Switch } from "@/components/ui/switch";
import { CLIENT_PREFERENCE_CATEGORIES } from "@/lib/notifications/preference-categories";
import type { NotificationPreferenceKey } from "@/lib/notifications/preference-categories";
import type { NotificationChannel } from "@/lib/notifications/types";
import { setNotificationPreference } from "../notification-actions";

const CHANNELS: { key: NotificationChannel; label: string }[] = [
  { key: "in_app", label: "Sur le site" },
  { key: "email", label: "Par email" },
  { key: "push", label: "Sur le téléphone" },
];

type Props = {
  overrides: Record<string, boolean>;
  /** Faux tant qu'aucun navigateur n'est abonné : la colonne reste grisée. */
  pushEnabled: boolean;
};

/**
 * Les catégories imposées restent affichées, en lecture seule : les cacher
 * ferait croire qu'on envoie des choses non déclarées.
 */
export const NotificationPreferences = ({ overrides, pushEnabled }: Props) => {
  const [state, setState] = useState(overrides);
  const [, startTransition] = useTransition();

  const isOn = (key: string, channel: NotificationChannel, fallback: boolean) =>
    state[`${key}:${channel}`] ?? fallback;

  const toggle = (
    key: NotificationPreferenceKey,
    channel: NotificationChannel,
    next: boolean,
  ) => {
    setState((prev) => ({ ...prev, [`${key}:${channel}`]: next }));
    startTransition(async () => {
      const result = await setNotificationPreference(key, channel, next);
      // Retour arriere visuel : sans cela, un refus serveur laisserait la
      // bascule dans un etat que la base ne connait pas.
      if (!result.success) {
        setState((prev) => ({ ...prev, [`${key}:${channel}`]: !next }));
      }
    });
  };

  const forced = CLIENT_PREFERENCE_CATEGORIES.filter((c) => c.forced);
  const optional = CLIENT_PREFERENCE_CATEGORIES.filter((c) => !c.forced);

  return (
    <div className="space-y-6">
      <section>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Toujours envoyé
        </p>
        <ul className="divide-y divide-border rounded-lg border border-border">
          {forced.map((cat) => (
            <li
              key={cat.key}
              className="flex items-center justify-between gap-4 px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium">{cat.label}</p>
                {cat.hint && (
                  <p className="text-xs text-muted-foreground">{cat.hint}</p>
                )}
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">
                Toujours envoyé
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          À votre choix
        </p>
        <ul className="divide-y divide-border rounded-lg border border-border">
          {optional.map((cat) => (
            <li
              key={cat.key}
              className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-sm font-medium">{cat.label}</p>
                {cat.hint && (
                  <p className="text-xs text-muted-foreground">{cat.hint}</p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                {CHANNELS.map((channel) => {
                  // Une categorie qui interdit le push n'affiche pas la
                  // bascule : la griser laisserait croire qu'un reglage la
                  // rendrait possible.
                  if (channel.key === "push" && cat.pushForbidden) return null;

                  const disabled = channel.key === "push" && !pushEnabled;

                  return (
                    <label
                      key={channel.key}
                      className="flex items-center gap-2"
                      title={
                        disabled
                          ? "Activez les notifications sur cet appareil pour utiliser ce canal"
                          : undefined
                      }
                    >
                      <span
                        className={
                          disabled
                            ? "text-xs text-muted-foreground/50"
                            : "text-xs text-muted-foreground"
                        }
                      >
                        {channel.label}
                      </span>
                      <Switch
                        checked={isOn(
                          cat.key,
                          channel.key,
                          cat.defaults[channel.key],
                        )}
                        disabled={disabled}
                        onCheckedChange={(next) =>
                          toggle(cat.key, channel.key, next)
                        }
                      />
                    </label>
                  );
                })}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
};
