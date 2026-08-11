"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { addWeightMeasurement } from "../../actions";

export const WeightForm = ({ childId }: { childId: string }) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [weightKg, setWeightKg] = useState("");
  const [measuredAt, setMeasuredAt] = useState("");

  const handleSubmit = () => {
    startTransition(async () => {
      const result = await addWeightMeasurement({
        child_id: childId,
        weight_grams: Math.round(Number(weightKg) * 1000),
        measured_at: measuredAt,
        source: "home",
      });
      if (result.success) {
        toast.success("Pesée ajoutée");
        setWeightKg("");
        setMeasuredAt("");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <div className="space-y-4">
      <h2 className="font-medium">Ajouter une pesée</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="weight-kg">Poids (kg)</Label>
          <Input
            id="weight-kg"
            type="number"
            step="0.01"
            value={weightKg}
            onChange={(e) => setWeightKg(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="weight-date">Date de la pesée</Label>
          <Input
            id="weight-date"
            type="date"
            value={measuredAt}
            onChange={(e) => setMeasuredAt(e.target.value)}
          />
        </div>
      </div>
      <Button onClick={handleSubmit} disabled={isPending}>
        Ajouter
      </Button>
    </div>
  );
};
