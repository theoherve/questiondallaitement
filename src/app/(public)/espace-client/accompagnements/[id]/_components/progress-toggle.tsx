"use client";

import { useTransition } from "react";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
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

  const handleClick = () => {
    const next = !isCompleted;
    onToggle(blockId, next);
    if (readOnly || !enrollmentId) return;
    startTransition(async () => {
      if (next) {
        await markBlockComplete(enrollmentId, blockId);
      } else {
        await markBlockIncomplete(enrollmentId, blockId);
      }
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending || readOnly}
      aria-pressed={isCompleted}
      aria-label={
        isCompleted ? "Marquer comme à revoir" : "Marquer comme terminé"
      }
      tabIndex={0}
      className={cn(
        "inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-red",
        "disabled:cursor-not-allowed disabled:opacity-60",
        isCompleted
          ? "border-accent-sage/50 bg-accent-sage/20 text-primary-green hover:bg-accent-sage/30"
          : "border-border bg-background-beige text-primary-green hover:border-primary-red/40 hover:bg-primary-red/5"
      )}
    >
      {isPending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
      ) : (
        <span
          className={cn(
            "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors",
            isCompleted
              ? "border-accent-sage bg-accent-sage text-primary-green"
              : "border-muted-foreground/40"
          )}
          aria-hidden
        >
          {isCompleted && <Check className="h-3 w-3" strokeWidth={3} />}
        </span>
      )}
      {isCompleted ? "Terminé" : "Marquer comme terminé"}
    </button>
  );
};
