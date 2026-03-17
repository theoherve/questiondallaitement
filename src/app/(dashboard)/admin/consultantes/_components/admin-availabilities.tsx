"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Trash2, Check, X } from "lucide-react";
import {
  adminCreateAvailability,
  adminDeleteAvailability,
} from "../[id]/actions";

type Availability = {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
};

type Props = {
  consultantId: string;
  availabilities: Availability[];
};

const DAYS: { value: number; short: string }[] = [
  { value: 1, short: "Lun" },
  { value: 2, short: "Mar" },
  { value: 3, short: "Mer" },
  { value: 4, short: "Jeu" },
  { value: 5, short: "Ven" },
  { value: 6, short: "Sam" },
  { value: 0, short: "Dim" },
];

export const AdminAvailabilities = ({ consultantId, availabilities }: Props) => {
  const [isPending, startTransition] = useTransition();
  const [addingDay, setAddingDay] = useState<number | null>(null);
  const [newStart, setNewStart] = useState("09:00");
  const [newEnd, setNewEnd] = useState("17:00");
  const [error, setError] = useState<string | null>(null);

  const slotsForDay = (day: number) =>
    availabilities
      .filter((a) => a.day_of_week === day)
      .sort((a, b) => a.start_time.localeCompare(b.start_time));

  const handleAdd = (day: number) => {
    setError(null);
    startTransition(async () => {
      const result = await adminCreateAvailability(consultantId, {
        day_of_week: day,
        start_time: newStart,
        end_time: newEnd,
      });
      if (result.success) {
        setAddingDay(null);
        setNewStart("09:00");
        setNewEnd("17:00");
      } else {
        setError(result.error ?? "Erreur");
      }
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      await adminDeleteAvailability(consultantId, id);
    });
  };

  const openAdd = (day: number) => {
    setAddingDay(day);
    setError(null);
    setNewStart("09:00");
    setNewEnd("17:00");
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-serif text-lg font-semibold text-primary-green">
          Disponibilités récurrentes
        </h2>
        <p className="text-sm text-muted-foreground">
          Créneaux habituels par jour de semaine.
        </p>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {DAYS.map(({ value: day, short }) => {
          const slots = slotsForDay(day);
          const isAdding = addingDay === day;

          return (
            <div key={day} className="flex flex-col gap-1">
              {/* Day header */}
              <div className="py-1.5 text-center text-xs font-semibold text-primary-green/60">
                {short}
              </div>

              {/* Slots */}
              <div className="flex min-h-[60px] flex-col gap-1">
                {slots.map((slot) => (
                  <div
                    key={slot.id}
                    className="group relative flex flex-col items-center rounded border border-primary-green/20 bg-primary-green/5 px-1 py-1.5 text-center"
                  >
                    <span className="text-xs font-medium text-primary-green leading-tight">
                      {slot.start_time.slice(0, 5)}
                    </span>
                    <span className="text-[10px] text-primary-green/50">↓</span>
                    <span className="text-xs font-medium text-primary-green leading-tight">
                      {slot.end_time.slice(0, 5)}
                    </span>
                    <button
                      onClick={() => handleDelete(slot.id)}
                      disabled={isPending}
                      className="absolute -right-1.5 -top-1.5 hidden cursor-pointer rounded-full bg-destructive p-0.5 text-white group-hover:flex"
                      aria-label="Supprimer"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Inline add form */}
              {isAdding ? (
                <div className="flex flex-col gap-1 rounded border border-primary-red/30 bg-primary-red/5 p-1.5">
                  <Input
                    type="time"
                    value={newStart}
                    onChange={(e) => setNewStart(e.target.value)}
                    className="h-7 px-1 text-xs"
                  />
                  <Input
                    type="time"
                    value={newEnd}
                    onChange={(e) => setNewEnd(e.target.value)}
                    className="h-7 px-1 text-xs"
                  />
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleAdd(day)}
                      disabled={isPending}
                      className="flex flex-1 cursor-pointer items-center justify-center rounded bg-primary-red py-1 text-white"
                      aria-label="Confirmer"
                    >
                      {isPending ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Check className="h-3 w-3" />
                      )}
                    </button>
                    <button
                      onClick={() => setAddingDay(null)}
                      className="flex flex-1 cursor-pointer items-center justify-center rounded border py-1 text-primary-green/60"
                      aria-label="Annuler"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                  {error && (
                    <p className="text-[10px] text-destructive">{error}</p>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => openAdd(day)}
                  className="flex cursor-pointer items-center justify-center rounded border border-dashed border-primary-green/20 py-1.5 text-primary-green/40 transition-colors hover:border-primary-red/40 hover:text-primary-red"
                  aria-label={`Ajouter un créneau`}
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
