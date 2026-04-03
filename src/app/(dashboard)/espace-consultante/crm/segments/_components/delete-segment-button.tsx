"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { deleteSegment } from "../actions";
import { useRouter } from "next/navigation";

interface Props {
  segmentId: string;
}

export function DeleteSegmentButton({ segmentId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!confirm("Supprimer ce segment ?")) return;
    setLoading(true);
    const result = await deleteSegment(segmentId);
    if (result.success) {
      router.refresh();
    } else {
      alert(result.error ?? "Erreur lors de la suppression");
    }
    setLoading(false);
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleDelete}
      disabled={loading}
    >
      <Trash2 className="h-4 w-4 text-destructive" />
    </Button>
  );
}
