import { createAdminClient } from "@/lib/supabase/admin";

export const SEO_DEFAULTS_KEY = "seo_defaults";

export type SeoDefaults = {
  contact_email: string;
};

export const DEFAULT_SEO_DEFAULTS: SeoDefaults = {
  contact_email:
    process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "contact@questiondallaitement.fr",
};

const safeJsonParse = (raw: string): Record<string, unknown> => {
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

export const parseSeoDefaults = (raw: unknown): SeoDefaults => {
  const src =
    typeof raw === "string"
      ? safeJsonParse(raw)
      : raw && typeof raw === "object"
        ? (raw as Record<string, unknown>)
        : {};

  const out = { ...DEFAULT_SEO_DEFAULTS };
  const value = src.contact_email;
  if (typeof value === "string" && value.length > 0) {
    out.contact_email = value;
  }
  return out;
};

const TTL_MS = 60_000;
let cached: { value: SeoDefaults; at: number } | null = null;

export const invalidateSeoDefaultsCache = () => {
  cached = null;
};

export const getSeoDefaults = async (): Promise<SeoDefaults> => {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.value;

  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("platform_settings")
      .select("value")
      .eq("key", SEO_DEFAULTS_KEY)
      .maybeSingle();

    const value = parseSeoDefaults(data?.value);
    cached = { value, at: Date.now() };
    return value;
  } catch (e) {
    console.error("[seo-defaults] lecture des reglages echouee", e);
    return DEFAULT_SEO_DEFAULTS;
  }
};

export const saveSeoDefaults = async (
  defaults: SeoDefaults,
): Promise<{ error: string | null }> => {
  const supabase = createAdminClient();
  const { error } = await supabase.from("platform_settings").upsert(
    {
      key: SEO_DEFAULTS_KEY,
      value: defaults as unknown as Record<string, unknown>,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" },
  );

  if (error) return { error: "Erreur lors de l'enregistrement de l'email de contact." };

  invalidateSeoDefaultsCache();
  return { error: null };
};

/** Raccourci pour les appelants qui n'ont besoin que de l'adresse (pages légales, API routes). */
export const getContactEmail = async (): Promise<string> =>
  (await getSeoDefaults()).contact_email;
