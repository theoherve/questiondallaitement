"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationList } from "@/components/notifications/notification-list";
import type { Notification } from "@/types/database";

const REFETCH_MS = 60_000;

type Props = { historyHref: string };

/**
 * Cloche du header. Le compteur ne bouge pas à l'ouverture du panneau : la
 * lecture se fait par item, sinon des notifications jamais affichées seraient
 * marquées lues et deviendraient introuvables.
 */
export const NotificationBell = ({ historyHref }: Props) => {
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?limit=10");
      if (!res.ok) return;
      const data = (await res.json()) as {
        items: Notification[];
        unreadCount: number;
      };
      setItems(data.items);
      setUnread(data.unreadCount);
    } catch {
      // Le compteur peut rester en retard, ce n'est pas une erreur bloquante.
    }
  }, []);

  useEffect(() => {
    // Le premier chargement passe par un timer comme les suivants : appeler
    // `load()` directement ici déclencherait `setState` dans le corps de
    // l'effet, ce que react-hooks/set-state-in-effect refuse.
    const initial = setTimeout(load, 0);
    const timer = setInterval(load, REFETCH_MS);
    return () => {
      clearTimeout(initial);
      clearInterval(timer);
    };
  }, [load]);

  const markRead = async (id: string) => {
    setItems((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, read_at: new Date().toISOString() } : n
      )
    );
    setUnread((c) => Math.max(0, c - 1));
    await fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
  };

  const markAllRead = async () => {
    const now = new Date().toISOString();
    setItems((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? now })));
    setUnread(0);
    await fetch("/api/notifications/read-all", { method: "PATCH" });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-primary-green hover:bg-primary-red/10 hover:text-primary-red"
          aria-label={
            unread > 0 ? `Notifications, ${unread} non lues` : "Notifications"
          }
        >
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-primary-red px-1 text-[10px] font-semibold leading-4 text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-90 p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <span className="text-sm font-semibold text-primary-green">
            Notifications
          </span>
          {unread > 0 && (
            <button
              type="button"
              onClick={markAllRead}
              className="text-[11px] text-muted-foreground underline"
            >
              Tout marquer comme lu
            </button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          <NotificationList items={items} onRead={markRead} />
        </div>
        <Link
          href={historyHref}
          className="block border-t border-border px-4 py-2.5 text-center text-xs font-semibold text-primary-green"
        >
          Voir tout l&apos;historique
        </Link>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
