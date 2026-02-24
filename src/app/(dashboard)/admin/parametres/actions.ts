"use server";

import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { platformSettingsSchema } from "@/validations/platform-settings";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionResult } from "@/types";

const requireAdmin = async () => {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") redirect("/connexion");
  return user;
};

export type PlatformSettings = {
  default_commission_rate: number;
  cancellation_threshold_hours: number;
  cancellation_penalty_rate: number;
  platform_name: string;
  maintenance_mode: boolean;
};

const SETTINGS_KEYS: (keyof PlatformSettings)[] = [
  "default_commission_rate",
  "cancellation_threshold_hours",
  "cancellation_penalty_rate",
  "platform_name",
  "maintenance_mode",
];

const parseValue = (key: keyof PlatformSettings, raw: unknown): unknown => {
  const str = typeof raw === "string" ? raw : JSON.stringify(raw);
  switch (key) {
    case "default_commission_rate":
    case "cancellation_threshold_hours":
    case "cancellation_penalty_rate":
      return parseFloat(str);
    case "maintenance_mode":
      return str === "true";
    case "platform_name":
      return str.replace(/^"|"$/g, "");
    default:
      return str;
  }
};

export const getPlatformSettings =
  async (): Promise<PlatformSettings> => {
    const supabase = createAdminClient();

    const { data } = await supabase
      .from("platform_settings")
      .select("key, value")
      .in("key", SETTINGS_KEYS);

    const settings: PlatformSettings = {
      default_commission_rate: 15,
      cancellation_threshold_hours: 48,
      cancellation_penalty_rate: 0.5,
      platform_name: "Question d'Allaitement",
      maintenance_mode: false,
    };

    for (const row of data ?? []) {
      const key = row.key as keyof PlatformSettings;
      if (SETTINGS_KEYS.includes(key)) {
        const parsed = parseValue(key, row.value);
        (settings as Record<string, unknown>)[key] = parsed;
      }
    }

    return settings;
  };

export const updatePlatformSettings = async (
  data: unknown
): Promise<ActionResult> => {
  const admin = await requireAdmin();

  const parsed = platformSettingsSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const supabase = createAdminClient();
  const entries: { key: string; value: unknown }[] = [
    { key: "default_commission_rate", value: parsed.data.default_commission_rate.toString() },
    { key: "cancellation_threshold_hours", value: parsed.data.cancellation_threshold_hours.toString() },
    { key: "cancellation_penalty_rate", value: parsed.data.cancellation_penalty_rate.toString() },
    { key: "platform_name", value: JSON.stringify(parsed.data.platform_name) },
    { key: "maintenance_mode", value: parsed.data.maintenance_mode.toString() },
  ];

  for (const entry of entries) {
    const { error } = await supabase
      .from("platform_settings")
      .update({ value: entry.value, updated_at: new Date().toISOString() })
      .eq("key", entry.key);

    if (error) {
      return { success: false, error: `Erreur lors de la mise à jour de ${entry.key}` };
    }
  }

  await supabase.from("audit_logs").insert({
    user_id: admin.id,
    action: "platform_settings_updated",
    entity_type: "platform_settings",
    entity_id: null,
    metadata: parsed.data as unknown as Record<string, unknown>,
  });

  revalidatePath("/admin/parametres");
  revalidatePath("/");
  return { success: true };
};
