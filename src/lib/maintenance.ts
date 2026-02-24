import { createAdminClient } from "@/lib/supabase/admin";

let cachedValue: boolean | null = null;
let cachedAt = 0;
const CACHE_TTL_MS = 30_000;

export const isMaintenanceMode = async (): Promise<boolean> => {
  const now = Date.now();
  if (cachedValue !== null && now - cachedAt < CACHE_TTL_MS) {
    return cachedValue;
  }

  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("platform_settings")
      .select("value")
      .eq("key", "maintenance_mode")
      .single();

    const value = data?.value === "true" || data?.value === true;
    cachedValue = value;
    cachedAt = now;
    return value;
  } catch {
    return cachedValue ?? false;
  }
};
