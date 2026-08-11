"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
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
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { deleteWeightMeasurement } from "../../actions";
import type { WeightMeasurement } from "@/types/database";

export const MeasurementList = ({
  measurements,
}: {
  measurements: WeightMeasurement[];
}) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleDelete = (measurementId: string) => {
    startTransition(async () => {
      const result = await deleteWeightMeasurement(measurementId);
      if (result.success) {
        toast.success("Pesée supprimée");
        router.refresh();
      } else {
        // Le serveur reste seul juge : fenêtre de 24h dépassée, pesée
        // enregistrée par la consultante, etc.
        toast.error(result.error ?? "Une erreur est survenue");
      }
    });
  };

  if (measurements.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Aucune pesée enregistrée pour le moment.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="font-medium">Pesées enregistrées</h2>
      <ul className="divide-y rounded-md border">
        {[...measurements]
          .sort((a, b) => b.measured_at.localeCompare(a.measured_at))
          .map((measurement) => (
            <li
              key={measurement.id}
              className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
            >
              <span>
                {format(new Date(measurement.measured_at), "d MMM yyyy", {
                  locale: fr,
                })}{" "}
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
                    <AlertDialogTitle>Supprimer cette pesée ?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Vous ne pouvez supprimer que vos propres pesées, et
                      seulement dans les 24 heures qui suivent leur
                      enregistrement.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleDelete(measurement.id)}
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
  );
};
