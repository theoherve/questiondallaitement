"use client";

import { Switch } from "@/components/ui/switch";
import { toggleWorkflowActive } from "../actions";
import { useTransition } from "react";
import { toast } from "sonner";

export const WorkflowToggle = ({
  workflowId,
  isActive,
}: {
  workflowId: string;
  isActive: boolean;
}) => {
  const [isPending, startTransition] = useTransition();

  return (
    <Switch
      checked={isActive}
      disabled={isPending}
      onCheckedChange={(checked) => {
        startTransition(async () => {
          const result = await toggleWorkflowActive(workflowId, checked);
          if (!result.success) {
            toast.error(result.error ?? "Erreur");
          }
        });
      }}
    />
  );
};
