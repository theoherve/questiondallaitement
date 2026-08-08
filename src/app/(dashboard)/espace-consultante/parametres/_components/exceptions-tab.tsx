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
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { createException, deleteException } from "../actions";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

type Exception = {
  id: string;
  date: string;
  is_available: boolean;
  start_time: string | null;
  end_time: string | null;
  reason: string | null;
};

type ExceptionsTabProps = {
  exceptions: Exception[];
};

export const ExceptionsTab = ({ exceptions }: ExceptionsTabProps) => {
  const [isPending, startTransition] = useTransition();
  const [newDate, setNewDate] = useState("");
  const [isAvailable, setIsAvailable] = useState(false);
  const [newStart, setNewStart] = useState("09:00");
  const [newEnd, setNewEnd] = useState("17:00");
  const [newReason, setNewReason] = useState("");
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleAdd = () => {
    if (!newDate) return;
    setMessage(null);

    startTransition(async () => {
      const result = await createException({
        date: newDate,
        is_available: isAvailable,
        start_time: isAvailable ? newStart : null,
        end_time: isAvailable ? newEnd : null,
        reason: newReason,
      });
      setMessage(
        result.success
          ? { type: "success", text: "Exception ajoutée" }
          : { type: "error", text: result.error ?? "Erreur" }
      );
      if (result.success) {
        setNewDate("");
        setNewReason("");
        setIsAvailable(false);
      }
    });
  };

  const handleDelete = (id: string) => {
    setMessage(null);
    startTransition(async () => {
      const result = await deleteException(id);
      if (!result.success) {
        setMessage({ type: "error", text: result.error ?? "Erreur" });
      }
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-serif text-lg font-semibold text-primary-green">
          Exceptions
        </h2>
        <p className="text-sm text-muted-foreground">
          Ajoutez des congés, jours fériés ou créneaux exceptionnels.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ajouter une exception</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
            <div className="space-y-2">
              <Label>Raison</Label>
              <Input
                value={newReason}
                onChange={(e) => setNewReason(e.target.value)}
                placeholder="Ex : Jour férié, Congé..."
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Switch
              id="exception-available"
              checked={isAvailable}
              onCheckedChange={setIsAvailable}
            />
            <Label htmlFor="exception-available">
              {isAvailable
                ? "Créneau exceptionnel (disponible)"
                : "Jour indisponible (congé)"}
            </Label>
          </div>

          {isAvailable && (
            <div className="flex gap-4">
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
            </div>
          )}

          {message && (
            <p
              className={`text-sm ${message.type === "success" ? "text-green-600" : "text-destructive"}`}
              role="alert"
            >
              {message.text}
            </p>
          )}

          <Button
            onClick={handleAdd}
            disabled={isPending || !newDate}
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
        </CardContent>
      </Card>

      {exceptions.length > 0 ? (
        <div className="space-y-2">
          {exceptions.map((exc) => (
            <Card key={exc.id}>
              <CardContent className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <Badge
                    variant={exc.is_available ? "default" : "destructive"}
                    className="text-xs"
                  >
                    {exc.is_available ? "Dispo" : "Indispo"}
                  </Badge>
                  <div>
                    <p className="text-sm font-medium text-primary-green">
                      {format(new Date(exc.date + "T00:00:00"), "EEEE d MMMM yyyy", {
                        locale: fr,
                      })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {exc.is_available && exc.start_time && exc.end_time
                        ? `${exc.start_time.slice(0, 5)}, ${exc.end_time.slice(0, 5)}`
                        : "Toute la journée"}
                      {exc.reason && ` · ${exc.reason}`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(exc.id)}
                  disabled={isPending}
                  className="text-destructive hover:text-destructive/80"
                  aria-label="Supprimer cette exception"
                  tabIndex={0}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Aucune exception prévue.
          </CardContent>
        </Card>
      )}
    </div>
  );
};
