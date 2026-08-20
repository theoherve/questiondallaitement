"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { createChild } from "../actions";

export const ChildForm = () => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [firstName, setFirstName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [sex, setSex] = useState<"female" | "male">("female");
  const [isPremature, setIsPremature] = useState(false);
  const [gestationalWeeks, setGestationalWeeks] = useState("");
  const [birthWeightKg, setBirthWeightKg] = useState("");

  const handleSubmit = () => {
    startTransition(async () => {
      const result = await createChild({
        first_name: firstName,
        birth_date: birthDate,
        sex,
        is_premature: isPremature,
        gestational_age_weeks: isPremature
          ? Number(gestationalWeeks)
          : undefined,
        birth_weight_grams: birthWeightKg
          ? Math.round(Number(birthWeightKg) * 1000)
          : undefined,
      });
      if (result.success) {
        toast.success("Enfant ajouté");
        setFirstName("");
        setBirthDate("");
        setIsPremature(false);
        setGestationalWeeks("");
        setBirthWeightKg("");
        router.refresh();
      } else {
        toast.error(result.error ?? "Une erreur est survenue");
      }
    });
  };

  return (
    <div className="space-y-4">
      <h2 className="font-medium">Ajouter un enfant</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="child-first-name">Prénom</Label>
          <Input
            id="child-first-name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="child-birth-date">Date de naissance</Label>
          <Input
            id="child-birth-date"
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="child-sex">Sexe</Label>
          <select
            id="child-sex"
            className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            value={sex}
            onChange={(e) => setSex(e.target.value as "female" | "male")}
          >
            <option value="female">Fille</option>
            <option value="male">Garçon</option>
          </select>
        </div>
        <div>
          <Label htmlFor="child-birth-weight">Poids de naissance (kg, optionnel)</Label>
          <Input
            id="child-birth-weight"
            type="number"
            step="0.01"
            min="0"
            value={birthWeightKg}
            onChange={(e) => setBirthWeightKg(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 pt-6">
          <Checkbox
            id="child-premature"
            checked={isPremature}
            onCheckedChange={(checked) => setIsPremature(checked === true)}
          />
          <Label htmlFor="child-premature">Né prématurément</Label>
        </div>
        {isPremature && (
          <div>
            <Label htmlFor="child-gestational-weeks">
              Semaines de grossesse à la naissance
            </Label>
            <Input
              id="child-gestational-weeks"
              type="number"
              value={gestationalWeeks}
              onChange={(e) => setGestationalWeeks(e.target.value)}
            />
          </div>
        )}
      </div>
      <Button onClick={handleSubmit} disabled={isPending}>
        Ajouter
      </Button>
    </div>
  );
};
