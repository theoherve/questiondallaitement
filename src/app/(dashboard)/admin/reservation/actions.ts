"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { ConsultationLocation, LocationConfig } from "@/types/database";
import type { ActionResult } from "@/types";

export const getLocationConfigs = async (): Promise<LocationConfig[]> => {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("location_configs")
    .select("*")
    .order("sort_order");
  return (data as LocationConfig[]) ?? [];
};

export type LocationConfigFormData = {
  label: string;
  description: string;
  address: string;
  city: string;
  postal_code: string;
  is_active: boolean;
};

export const updateLocationConfig = async (
  locationType: ConsultationLocation,
  formData: LocationConfigFormData
): Promise<ActionResult<void>> => {
  const user = await getSessionUser();
  if (!user?.roles.includes("admin")) redirect("/admin");

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("location_configs")
    .update({
      label: formData.label || "",
      description: formData.description || null,
      address: formData.address || null,
      city: formData.city || null,
      postal_code: formData.postal_code || null,
      is_active: formData.is_active,
    })
    .eq("location_type", locationType)
    .select("location_type");

  if (error) return { success: false, error: error.message };
  if (!data || data.length === 0) return { success: false, error: "Type de lieu introuvable" };
  return { success: true };
};
