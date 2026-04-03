"use client";

import { useRouter } from "next/navigation";
import { SegmentForm } from "../../_components/segment-form";
import { updateSegment } from "../../actions";
import type { CrmSegment } from "@/types/database";

interface Props {
  segment: CrmSegment;
}

export function EditSegmentForm({ segment }: Props) {
  const router = useRouter();

  const handleSubmit = async (data: Parameters<typeof updateSegment>[1]) => {
    const result = await updateSegment(segment.id, data);
    if (result.success) {
      router.push("/espace-consultante/crm/segments");
      router.refresh();
    } else {
      throw new Error(result.error ?? "Erreur");
    }
  };

  return (
    <SegmentForm
      initial={segment}
      onSubmit={handleSubmit}
      submitLabel="Enregistrer les modifications"
    />
  );
}
