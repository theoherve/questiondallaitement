"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { differenceInMonths } from "date-fns";
import { WeightChart } from "@/components/growth-charts/weight-chart";
import { addWeightMeasurementAsConsultant } from "../actions";
import type { Child, WeightMeasurement } from "@/types/database";

export const ChildrenPanel = ({
  children,
  measurementsByChild,
}: {
  children: Child[];
  measurementsByChild: Record<string, WeightMeasurement[]>;
}) => {
  const [selectedChildId, setSelectedChildId] = useState<string | null>(
    children[0]?.id ?? null,
  );
  const [weightKg, setWeightKg] = useState("");
  const [measuredAt, setMeasuredAt] = useState("");
  const [isPending, startTransition] = useTransition();

  if (children.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Ce client n&apos;a renseigné aucun enfant.
      </p>
    );
  }

  const selectedChild = children.find((c) => c.id === selectedChildId);

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
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {children.map((child) => (
          <Button
            key={child.id}
            variant={child.id === selectedChildId ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedChildId(child.id)}
          >
            {child.first_name} ·{" "}
            {differenceInMonths(new Date(), new Date(child.birth_date))} mois
          </Button>
        ))}
      </div>

      {selectedChild && (
        <>
          <WeightChart
            measurements={measurementsByChild[selectedChild.id] ?? []}
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
        </>
      )}
    </div>
  );
};
