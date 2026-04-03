"use client";

import { useRouter } from "next/navigation";
import { SegmentForm } from "../_components/segment-form";
import { createSegment } from "../actions";

export function NewSegmentForm() {
  const router = useRouter();

  const handleSubmit = async (data: Parameters<typeof createSegment>[0]) => {
    const result = await createSegment(data);
    if (result.success) {
      router.push("/espace-consultante/crm/segments");
      router.refresh();
    } else {
      throw new Error(result.error ?? "Erreur");
    }
  };

  return <SegmentForm onSubmit={handleSubmit} submitLabel="Créer le segment" />;
}
