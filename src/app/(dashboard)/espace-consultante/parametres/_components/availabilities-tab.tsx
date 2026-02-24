"use client";

import { useState, useTransition } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { createAvailability, deleteAvailability } from "../actions";

type Availability = {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
};

type AvailabilitiesTabProps = {
  availabilities: Availability[];
};

const DAY_LABELS = [
  "Dimanche",
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
];

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

export const AvailabilitiesTab = ({
  availabilities,
}: AvailabilitiesTabProps) => {
  const [isPending, startTransition] = useTransition();
  const [newDay, setNewDay] = useState("1");
  const [newStart, setNewStart] = useState("09:00");
  const [newEnd, setNewEnd] = useState("17:00");
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const grouped = DAY_ORDER.map((day) => ({
    day,
    label: DAY_LABELS[day],
    slots: availabilities
      .filter((a) => a.day_of_week === day)
      .sort((a, b) => a.start_time.localeCompare(b.start_time)),
  })).filter((g) => g.slots.length > 0);

  const handleAdd = () => {
    setMessage(null);
    startTransition(async () => {
      const result = await createAvailability({
        day_of_week: Number(newDay),
        start_time: newStart,
        end_time: newEnd,
      });
      setMessage(
        result.success
          ? { type: "success", text: "Créneau ajouté" }
          : { type: "error", text: result.error ?? "Erreur" }
      );
    });
  };

  const handleDelete = (id: string) => {
    setMessage(null);
    startTransition(async () => {
      const result = await deleteAvailability(id);
      if (!result.success) {
        setMessage({ type: "error", text: result.error ?? "Erreur" });
      }
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-serif text-lg font-semibold text-primary-green">
          Disponibilités récurrentes
        </h2>
        <p className="text-sm text-muted-foreground">
          Définissez vos créneaux habituels par jour de semaine.
        </p>
      </div>

      {/* Add new slot */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ajouter un créneau</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-2">
              <Label>Jour</Label>
              <Select value={newDay} onValueChange={setNewDay}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAY_ORDER.map((d) => (
                    <SelectItem key={d} value={String(d)}>
                      {DAY_LABELS[d]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Début</Label>
              <Input
                type="time"
                value={newStart}
                onChange={(e) => setNewStart(e.target.value)}
                className="w-[120px]"
              />
            </div>
            <div className="space-y-2">
              <Label>Fin</Label>
              <Input
                type="time"
                value={newEnd}
                onChange={(e) => setNewEnd(e.target.value)}
                className="w-[120px]"
              />
            </div>
            <Button
              onClick={handleAdd}
              disabled={isPending}
              size="sm"
              className="bg-primary-red hover:bg-primary-red-dark"
            >
              {isPending ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <Plus className="mr-1 h-3 w-3" />
              )}
              Ajouter
            </Button>
          </div>
          {message && (
            <p
              className={`mt-2 text-sm ${message.type === "success" ? "text-green-600" : "text-destructive"}`}
              role="alert"
            >
              {message.text}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Existing slots grouped by day */}
      {grouped.length > 0 ? (
        grouped.map((group) => (
          <Card key={group.day}>
            <CardContent className="pt-4">
              <h3 className="mb-2 font-medium text-primary-green">
                {group.label}
              </h3>
              <div className="flex flex-wrap gap-2">
                {group.slots.map((slot) => (
                  <div
                    key={slot.id}
                    className="flex items-center gap-2 rounded-md border px-3 py-1.5"
                  >
                    <Badge variant="outline" className="text-xs">
                      {slot.start_time.slice(0, 5)} — {slot.end_time.slice(0, 5)}
                    </Badge>
                    <button
                      onClick={() => handleDelete(slot.id)}
                      disabled={isPending}
                      className="text-destructive hover:text-destructive/80"
                      aria-label={`Supprimer créneau ${slot.start_time} — ${slot.end_time}`}
                      tabIndex={0}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Aucun créneau défini. Ajoutez vos disponibilités habituelles.
          </CardContent>
        </Card>
      )}
    </div>
  );
};
