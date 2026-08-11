import { createAdminClient } from "@/lib/supabase/admin";

export const FEATURE_FLAGS_KEY = "feature_flags";

export type FeatureFlags = {
  booking_enabled: boolean;
};

export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  booking_enabled: process.env.NEXT_PUBLIC_BOOKING_ENABLED !== "false",
};

const safeJsonParse = (raw: string): Record<string, unknown> => {
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

export const parseFeatureFlags = (raw: unknown): FeatureFlags => {
  const src =
    typeof raw === "string"
      ? safeJsonParse(raw)
      : raw && typeof raw === "object"
        ? (raw as Record<string, unknown>)
        : {};

  const out = { ...DEFAULT_FEATURE_FLAGS };
  if (typeof src.booking_enabled === "boolean") {
    out.booking_enabled = src.booking_enabled;
  }
  return out;
};

const TTL_MS = 60_000;
let cached: { value: FeatureFlags; at: number } | null = null;

export const invalidateFeatureFlagsCache = () => {
  cached = null;
};

export const getFeatureFlags = async (): Promise<FeatureFlags> => {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.value;

  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("platform_settings")
      .select("value")
      .eq("key", FEATURE_FLAGS_KEY)
      .maybeSingle();

    const value = parseFeatureFlags(data?.value);
    cached = { value, at: Date.now() };
    return value;
  } catch (e) {
    console.error("[feature-flags] lecture des reglages echouee", e);
    return DEFAULT_FEATURE_FLAGS;
  }
};

export const saveFeatureFlags = async (
  flags: FeatureFlags,
): Promise<{ error: string | null }> => {
  const supabase = createAdminClient();
  const { error } = await supabase.from("platform_settings").upsert(
    {
      key: FEATURE_FLAGS_KEY,
      value: flags as unknown as Record<string, unknown>,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" },
  );

  if (error) return { error: "Erreur lors de l'enregistrement des feature flags." };

  invalidateFeatureFlagsCache();
  return { error: null };
};

/** Raccourci pour les Server Components qui n'ont besoin que du booléen. */
export const isBookingEnabled = async (): Promise<boolean> =>
  (await getFeatureFlags()).booking_enabled;
