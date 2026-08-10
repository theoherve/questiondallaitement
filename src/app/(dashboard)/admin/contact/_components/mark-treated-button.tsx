"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { markContactMessageTreated } from "../actions";

export const MarkTreatedButton = ({ id }: { id: string }) => {
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  if (done) {
    return <p className="text-sm text-primary-green/70">Marqué comme traité.</p>;
  }

  return (
    <Button
      variant="outline"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          const result = await markContactMessageTreated(id);
          if (result.success) setDone(true);
        })
      }
    >
      Marquer comme traité
    </Button>
  );
};
