"use client";

import { useState, useTransition } from "react";
import { Switch } from "@/components/ui/switch";
import { toggleConsultantActive } from "../actions";

type ConsultantActiveToggleProps = {
  id: string;
  isActive: boolean;
};

export const ConsultantActiveToggle = ({
  id,
  isActive,
}: ConsultantActiveToggleProps) => {
  const [optimistic, setOptimistic] = useState(isActive);
  const [isPending, startTransition] = useTransition();

  const handleToggle = () => {
    const newValue = !optimistic;
    setOptimistic(newValue);

    startTransition(async () => {
      const result = await toggleConsultantActive(id);
      if (!result.success) {
        setOptimistic(!newValue);
      }
    });
  };

  return (
    <Switch
      checked={optimistic}
      onCheckedChange={handleToggle}
      disabled={isPending}
      aria-label={optimistic ? "Désactiver la consultante" : "Activer la consultante"}
    />
  );
};
