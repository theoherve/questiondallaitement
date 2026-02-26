"use client";

import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { refreshMyCampaignStats } from "../../../actions";
import { useRouter } from "next/navigation";

export const ConsultantRefreshStatsButton = ({
  campaignId,
}: {
  campaignId: string;
}) => {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const result = await refreshMyCampaignStats(campaignId);
      if (result.success) {
        toast.success("Statistiques mises à jour.");
        router.refresh();
      } else {
        toast.error(result.error ?? "Erreur.");
      }
    } catch {
      toast.error("Erreur lors du rafraîchissement.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
      <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
      Rafraîchir les stats
    </Button>
  );
};
