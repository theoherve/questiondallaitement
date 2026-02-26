"use client";

import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { triggerBatchSync } from "../actions";

export const SyncButton = () => {
  const [loading, setLoading] = useState(false);

  const handleSync = async () => {
    setLoading(true);
    try {
      const result = await triggerBatchSync();
      if (result.success && result.data) {
        toast.success(
          `Sync terminée : ${result.data.synced}/${result.data.total} contacts synchronisés${
            result.data.errors > 0 ? ` (${result.data.errors} erreurs)` : ""
          }`
        );
      } else {
        toast.error(result.error ?? "Erreur lors de la synchronisation.");
      }
    } catch {
      toast.error("Erreur lors de la synchronisation.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="outline" onClick={handleSync} disabled={loading}>
      <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
      {loading ? "Sync en cours..." : "Sync contacts Brevo"}
    </Button>
  );
};
