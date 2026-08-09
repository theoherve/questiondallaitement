"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { Notification } from "@/types/database";

type Props = {
  items: Notification[];
  onRead: (id: string) => void;
  emptyLabel?: string;
};

/**
 * Liste partagée entre le panneau de la cloche et les pages d'historique.
 *
 * Le bouton d'action n'apparaît que quand le catalogue en déclare un : un
 * bouton « Voir » à côté d'un titre déjà cliquable n'ajoute que du bruit, et
 * quand tout est mis en avant plus rien ne l'est.
 */
export const NotificationList = ({ items, onRead, emptyLabel }: Props) => {
  if (items.length === 0) {
    return (
      <p className="px-4 py-6 text-center text-sm text-muted-foreground">
        {emptyLabel ?? "Aucune notification pour le moment."}
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {items.map((n) => {
        const unread = n.read_at === null;
        return (
          <li
            key={n.id}
            className={cn("px-4 py-3", unread && "bg-primary-green/5")}
          >
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                {n.href ? (
                  <Link
                    href={n.href}
                    onClick={() => unread && onRead(n.id)}
                    className="block"
                  >
                    <span className="text-sm font-semibold text-foreground">
                      {n.title}
                    </span>
                  </Link>
                ) : (
                  <span className="text-sm font-semibold text-foreground">
                    {n.title}
                  </span>
                )}
                {n.body && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {n.body}
                  </p>
                )}
                {n.actions && n.actions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {n.actions.slice(0, 2).map((action) => (
                      <Link
                        key={action.href}
                        href={action.href}
                        onClick={() => unread && onRead(n.id)}
                        className={cn(
                          "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                          action.variant === "secondary"
                            ? "border-border text-muted-foreground hover:bg-muted"
                            : "border-primary-green bg-primary-green text-white hover:bg-primary-green/90"
                        )}
                      >
                        {action.label}
                      </Link>
                    ))}
                  </div>
                )}
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {formatDistanceToNow(new Date(n.created_at), {
                    addSuffix: true,
                    locale: fr,
                  })}
                </p>
              </div>
              {unread && (
                <span
                  aria-label="Non lue"
                  className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-red"
                />
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
};
