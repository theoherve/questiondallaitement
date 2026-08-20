"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { differenceInMonths, format } from "date-fns";
import { fr } from "date-fns/locale";
import { WeightChart } from "@/components/growth-charts/weight-chart";
import {
  computeWeightAlerts,
  type WeightAlert,
} from "@/lib/growth-charts/weight-alerts";
import {
  addWeightMeasurementAsConsultant,
  deleteChildAsConsultant,
  deleteWeightMeasurementAsConsultant,
} from "../actions";
import type { Child, WeightMeasurement } from "@/types/database";

// Ne garde qu'une alerte par règle (la plus récente selon la date de la
// mesure déclenchante) : évite d'empiler N lignes identiques quand une même
// règle se déclenche sur plusieurs mesures de l'historique.
const dedupeAlertsByRule = (
  alerts: WeightAlert[],
  measurementDateById: Map<string, string>,
): WeightAlert[] => {
  const latestByRule = new Map<string, WeightAlert>();
  for (const a of alerts) {
    const date = measurementDateById.get(a.measurementId) ?? "";
    const existing = latestByRule.get(a.rule);
    const existingDate = existing
      ? measurementDateById.get(existing.measurementId) ?? ""
      : null;
    if (!existing || date.localeCompare(existingDate ?? "") > 0) {
      latestByRule.set(a.rule, a);
    }
  }
  return alerts.filter((a) => latestByRule.get(a.rule) === a);
};

export const ChildrenPanel = ({
  childrenList,
  measurementsByChild,
}: {
  childrenList: Child[];
  measurementsByChild: Record<string, WeightMeasurement[]>;
}) => {
  const router = useRouter();
  const [selectedChildId, setSelectedChildId] = useState<string | null>(
    childrenList[0]?.id ?? null,
  );
  const [weightKg, setWeightKg] = useState("");
  const [measuredAt, setMeasuredAt] = useState("");
  const [isPending, startTransition] = useTransition();

  if (childrenList.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Ce client n&apos;a renseigné aucun enfant.
      </p>
    );
  }

  const selectedChild = childrenList.find((c) => c.id === selectedChildId);
  const selectedMeasurements = selectedChild
    ? (measurementsByChild[selectedChild.id] ?? [])
    : [];
  const measurementDateById = new Map(
    selectedMeasurements.map((m) => [m.id, m.measured_at]),
  );
  const selectedAlerts = selectedChild
    ? dedupeAlertsByRule(
        computeWeightAlerts(selectedChild, selectedMeasurements),
        measurementDateById,
      )
    : [];

  const handleAddMeasurement = () => {
    if (!selectedChildId) return;
    startTransition(async () => {
      const result = await addWeightMeasurementAsConsultant({
        child_id: selectedChildId,
        weight_grams: Math.round(Number(weightKg) * 1000),
        measured_at: measuredAt,
        source: "consultation",
      });
      if (result.success) {
        toast.success("Pesée ajoutée");
        setWeightKg("");
        setMeasuredAt("");
        router.refresh();
      } else {
        toast.error(result.error ?? "Une erreur est survenue");
      }
    });
  };

  const handleDeleteChild = (childId: string) => {
    startTransition(async () => {
      const result = await deleteChildAsConsultant(childId);
      if (result.success) {
        toast.success("Enfant supprimé");
        if (selectedChildId === childId) {
          setSelectedChildId(
            childrenList.find((c) => c.id !== childId)?.id ?? null,
          );
        }
        router.refresh();
      } else {
        toast.error(result.error ?? "Une erreur est survenue");
      }
    });
  };

  const handleDeleteMeasurement = (measurementId: string) => {
    startTransition(async () => {
      const result = await deleteWeightMeasurementAsConsultant(measurementId);
      if (result.success) {
        toast.success("Pesée supprimée");
        router.refresh();
      } else {
        toast.error(result.error ?? "Une erreur est survenue");
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {childrenList.map((child) => (
          <div key={child.id} className="flex items-center gap-1">
            <Button
              variant={child.id === selectedChildId ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedChildId(child.id)}
            >
              {child.first_name} ·{" "}
              {differenceInMonths(new Date(), new Date(child.birth_date))} mois
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={isPending}
                  aria-label={`Supprimer ${child.first_name}`}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Supprimer {child.first_name} ?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Toutes les pesées enregistrées pour cet enfant seront
                    définitivement supprimées. Cette action est irréversible.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => handleDeleteChild(child.id)}
                  >
                    Supprimer
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ))}
      </div>

      {selectedChild && (
        <>
          {selectedAlerts.length > 0 && (
            <div className="space-y-2 rounded-md border border-amber-300 bg-amber-50 p-3">
              {selectedAlerts.map((a) => {
                const measurementDate = measurementDateById.get(
                  a.measurementId,
                );
                return (
                  <p
                    key={`${a.rule}-${a.measurementId}`}
                    className={
                      a.level === "alerte"
                        ? "text-sm font-medium text-red-700"
                        : "text-sm font-medium text-amber-700"
                    }
                  >
                    {measurementDate
                      ? `Le ${format(new Date(measurementDate), "dd/MM/yyyy", { locale: fr })} — `
                      : ""}
                    {a.message}
                  </p>
                );
              })}
              <p className="text-xs text-muted-foreground">
                Aide à la décision — reste soumise à l&apos;appréciation clinique
                de la praticienne IBCLC.
              </p>
            </div>
          )}
          <WeightChart
            measurements={selectedMeasurements}
            birthDate={selectedChild.birth_date}
            sex={selectedChild.sex}
          />
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <Label htmlFor="crm-weight-kg">Poids (kg)</Label>
              <Input
                id="crm-weight-kg"
                type="number"
                step="0.01"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="crm-weight-date">Date</Label>
              <Input
                id="crm-weight-date"
                type="date"
                value={measuredAt}
                onChange={(e) => setMeasuredAt(e.target.value)}
              />
            </div>
            <Button onClick={handleAddMeasurement} disabled={isPending}>
              Ajouter la pesée
            </Button>
          </div>

          {selectedMeasurements.length > 0 && (
            <div className="space-y-1">
              <h3 className="text-sm font-medium">Pesées enregistrées</h3>
              <ul className="divide-y rounded-md border">
                {[...selectedMeasurements]
                  .sort((a, b) => b.measured_at.localeCompare(a.measured_at))
                  .map((measurement) => (
                    <li
                      key={measurement.id}
                      className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
                    >
                      <span>
                        {format(
                          new Date(measurement.measured_at),
                          "d MMM yyyy",
                          { locale: fr },
                        )}{" "}
                        · {(measurement.weight_grams / 1000).toFixed(2)} kg
                        <span className="ml-2 text-xs text-muted-foreground">
                          {measurement.source === "consultation"
                            ? "consultation"
                            : "domicile"}
                        </span>
                      </span>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={isPending}
                            aria-label="Supprimer cette pesée"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Supprimer cette pesée ?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              Cette pesée sera définitivement retirée du suivi de
                              l&apos;enfant.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() =>
                                handleDeleteMeasurement(measurement.id)
                              }
                            >
                              Supprimer
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
};
