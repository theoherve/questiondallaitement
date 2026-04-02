"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, Check, X, Copy } from "lucide-react";
import {
  adminCreateAvailability,
  adminDeleteAvailability,
  adminCopyAvailabilities,
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

  // Copy mode
  const [copyFromDay, setCopyFromDay] = useState<number | null>(null);
  const [copyTargets, setCopyTargets] = useState<number[]>([]);

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

  const startCopy = (day: number) => {
    setCopyFromDay(day);
    setCopyTargets([]);
    setAddingDay(null);
  };

  const cancelCopy = () => {
    setCopyFromDay(null);
    setCopyTargets([]);
  };

  const toggleCopyTarget = (day: number) => {
    setCopyTargets((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleCopy = () => {
    if (copyFromDay === null || copyTargets.length === 0) return;
    const slots = slotsForDay(copyFromDay).map(({ start_time, end_time }) => ({
      start_time,
      end_time,
    }));
    startTransition(async () => {
      const result = await adminCopyAvailabilities(
        consultantId,
        copyFromDay,
        copyTargets,
        slots
      );
      if (result.success) {
        cancelCopy();
      } else {
        setError(result.error ?? "Erreur lors de la copie");
      }
    });
  };

  const isCopyMode = copyFromDay !== null;

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
          const isCopySource = copyFromDay === day;
          const isCopyTarget = isCopyMode && copyTargets.includes(day);
          const isTargetable = isCopyMode && !isCopySource;

          return (
            <div key={day} className="flex flex-col gap-1">
              {/* Day header */}
              <button
                disabled={!isTargetable}
                onClick={() => isTargetable && toggleCopyTarget(day)}
                className={[
                  "py-1.5 text-center text-xs font-semibold rounded transition-colors",
                  isCopySource
                    ? "text-primary-red bg-primary-red/10"
                    : isTargetable
                    ? isCopyTarget
                      ? "text-white bg-primary-green cursor-pointer"
                      : "text-primary-green/60 border border-dashed border-primary-green/30 cursor-pointer hover:border-primary-green hover:text-primary-green"
                    : "text-primary-green/60",
                ].join(" ")}
              >
                {isCopySource ? (
                  <span className="flex items-center justify-center gap-0.5">
                    <Copy className="h-3 w-3" />
                    {short}
                  </span>
                ) : isTargetable && isCopyTarget ? (
                  <span className="flex items-center justify-center gap-0.5">
                    <Check className="h-3 w-3" />
                    {short}
                  </span>
                ) : (
                  short
                )}
              </button>

              {/* Slots */}
              <div className="flex min-h-[60px] flex-col gap-1">
                {slots.map((slot) => (
                  <div
                    key={slot.id}
                    className={[
                      "group relative flex flex-col items-center rounded border px-1 py-1.5 text-center",
                      isCopySource
                        ? "border-primary-red/30 bg-primary-red/5"
                        : "border-primary-green/20 bg-primary-green/5",
                    ].join(" ")}
                  >
                    <span className="text-xs font-medium text-primary-green leading-tight">
                      {slot.start_time.slice(0, 5)}
                    </span>
                    <span className="text-[10px] text-primary-green/50">↓</span>
                    <span className="text-xs font-medium text-primary-green leading-tight">
                      {slot.end_time.slice(0, 5)}
                    </span>
                    {!isCopyMode && (
                      <button
                        onClick={() => handleDelete(slot.id)}
                        disabled={isPending}
                        className="absolute -right-1.5 -top-1.5 hidden cursor-pointer rounded-full bg-destructive p-0.5 text-white group-hover:flex"
                        aria-label="Supprimer"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Inline add form or copy / add buttons */}
              {!isCopyMode && (
                <>
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
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => openAdd(day)}
                        className="flex cursor-pointer items-center justify-center rounded border border-dashed border-primary-green/20 py-1.5 text-primary-green/40 transition-colors hover:border-primary-red/40 hover:text-primary-red"
                        aria-label="Ajouter un créneau"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                      {slots.length > 0 && (
                        <button
                          onClick={() => startCopy(day)}
                          className="flex cursor-pointer items-center justify-center rounded border border-dashed border-primary-green/20 py-1.5 text-primary-green/40 transition-colors hover:border-primary-green/60 hover:text-primary-green"
                          aria-label="Dupliquer vers d'autres jours"
                          title="Dupliquer vers d'autres jours"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Copy mode action bar */}
      {isCopyMode && (
        <div className="flex items-center gap-3 rounded border border-primary-green/20 bg-primary-green/5 px-3 py-2 text-sm">
          <span className="flex-1 text-primary-green/70">
            {copyTargets.length === 0
              ? "Sélectionnez les jours cibles"
              : `Copier vers ${copyTargets.length} jour${copyTargets.length > 1 ? "s" : ""}`}
          </span>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <button
            onClick={handleCopy}
            disabled={isPending || copyTargets.length === 0}
            className="flex items-center gap-1.5 rounded bg-primary-green px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
          >
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
            Copier
          </button>
          <button
            onClick={cancelCopy}
            disabled={isPending}
            className="rounded border px-3 py-1.5 text-xs text-primary-green/60 hover:text-primary-green"
          >
            Annuler
          </button>
        </div>
      )}
    </div>
  );
};
