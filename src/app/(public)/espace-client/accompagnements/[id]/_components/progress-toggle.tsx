"use client";

import { useTransition } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { markBlockComplete, markBlockIncomplete } from "../actions";

type ProgressToggleProps = {
  enrollmentId?: string;
  blockId: string;
  isCompleted: boolean;
  onToggle: (blockId: string, completed: boolean) => void;
  readOnly?: boolean;
};

export const ProgressToggle = ({
  enrollmentId,
  blockId,
  isCompleted,
  onToggle,
  readOnly = false,
}: ProgressToggleProps) => {
  const [isPending, startTransition] = useTransition();

  const handleChange = (checked: boolean) => {
    onToggle(blockId, checked);
    if (readOnly || !enrollmentId) return;
    startTransition(async () => {
      if (checked) {
        await markBlockComplete(enrollmentId, blockId);
      } else {
        await markBlockIncomplete(enrollmentId, blockId);
      }
    });
  };

  return (
    <div className="flex items-center gap-2">
      {isPending ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      ) : (
        <Checkbox
          id={`block-${blockId}`}
          checked={isCompleted}
          onCheckedChange={(checked) => handleChange(!!checked)}
          aria-label="Marquer comme terminé"
        />
      )}
      <Label
        htmlFor={`block-${blockId}`}
        className="text-sm text-muted-foreground"
      >
        {isCompleted ? "Terminé" : "Marquer comme terminé"}
      </Label>
    </div>
  );
};
