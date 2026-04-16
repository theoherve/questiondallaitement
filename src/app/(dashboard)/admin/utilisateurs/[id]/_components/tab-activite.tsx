"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CalendarDays,
  BookOpen,
  CreditCard,
  Calendar,
  Shield,
  ChevronDown,
} from "lucide-react";

export type TimelineEntry = {
  id: string;
  type: "booking" | "enrollment" | "payment" | "event" | "audit";
  title: string;
  subtitle?: string;
  date: string;
  status?: string;
};

const ICON_MAP = {
  booking: CalendarDays,
  enrollment: BookOpen,
  payment: CreditCard,
  event: Calendar,
  audit: Shield,
};

const TYPE_LABEL: Record<string, string> = {
  booking: "Réservation",
  enrollment: "Formation",
  payment: "Paiement",
  event: "Événement",
  audit: "Action",
};

const TYPE_COLOR: Record<string, string> = {
  booking: "bg-blue-100 text-blue-700",
  enrollment: "bg-purple-100 text-purple-700",
  payment: "bg-green-100 text-green-700",
  event: "bg-orange-100 text-orange-700",
  audit: "bg-gray-100 text-gray-700",
};

const PAGE_SIZE = 20;

export const TabActivite = ({ entries }: { entries: TimelineEntry[] }) => {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const visibleEntries = entries.slice(0, visibleCount);
  const hasMore = visibleCount < entries.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-primary-green">
          Activité ({entries.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Aucune activité enregistrée.
          </p>
        ) : (
          <>
            <div className="relative space-y-0">
              {/* Timeline line */}
              <div className="absolute left-[19px] top-0 bottom-0 w-px bg-border" />

              {visibleEntries.map((entry, i) => {
                const Icon = ICON_MAP[entry.type];
                const colorClass =
                  TYPE_COLOR[entry.type] ?? "bg-gray-100 text-gray-700";

                return (
                  <div
                    key={`${entry.type}-${entry.id}-${i}`}
                    className="relative flex gap-4 pb-6"
                  >
                    <div
                      className={`z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${colorClass}`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 pt-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">
                          {TYPE_LABEL[entry.type] ?? entry.type}
                        </Badge>
                        {entry.status && (
                          <span className="text-xs text-muted-foreground">
                            {entry.status}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-sm font-medium">
                        {entry.title}
                      </p>
                      {entry.subtitle && (
                        <p className="text-xs text-muted-foreground">
                          {entry.subtitle}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Date(entry.date).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {hasMore && (
              <div className="mt-4 flex justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                >
                  <ChevronDown className="mr-2 h-4 w-4" />
                  Voir plus ({entries.length - visibleCount} restants)
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
