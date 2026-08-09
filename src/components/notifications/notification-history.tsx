"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { NotificationList } from "@/components/notifications/notification-list";
import type { Notification } from "@/types/database";

/**
 * Historique paginé, partagé par l'espace client et le dashboard. Un seul
 * séparateur, entre non lues et lues : à quelques notifications par semaine,
 * des filtres occuperaient plus de place qu'ils n'en feraient gagner.
 */
export const NotificationHistory = () => {
  const [items, setItems] = useState<Notification[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (from: string | null) => {
    setLoading(true);
    try {
      const url = from
        ? `/api/notifications?cursor=${encodeURIComponent(from)}`
        : "/api/notifications";
      const res = await fetch(url);
      if (!res.ok) return;
      const data = (await res.json()) as {
        items: Notification[];
        nextCursor: string | null;
      };
      setItems((prev) => (from ? [...prev, ...data.items] : data.items));
      setCursor(data.nextCursor);
      setDone(data.nextCursor === null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Passe par un timer plutôt qu'un appel direct : setState dans le corps de
    // l'effet est refusé par react-hooks/set-state-in-effect.
    const initial = setTimeout(() => load(null), 0);
    return () => clearTimeout(initial);
  }, [load]);

  const markRead = async (id: string) => {
    setItems((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, read_at: new Date().toISOString() } : n
      )
    );
    await fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
  };

  const unread = items.filter((n) => n.read_at === null);
  const read = items.filter((n) => n.read_at !== null);

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-lg border border-border bg-background">
        <NotificationList
          items={unread}
          onRead={markRead}
          emptyLabel="Vous êtes à jour, aucune notification non lue."
        />
      </div>

      {read.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Déjà lues
          </p>
          <div className="overflow-hidden rounded-lg border border-border bg-background">
            <NotificationList items={read} onRead={markRead} />
          </div>
        </div>
      )}

      {!done && (
        <div className="text-center">
          <Button
            variant="outline"
            disabled={loading}
            onClick={() => load(cursor)}
          >
            {loading ? "Chargement..." : "Charger les 20 suivantes"}
          </Button>
        </div>
      )}
    </div>
  );
};
