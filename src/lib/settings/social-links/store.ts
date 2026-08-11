import { createAdminClient } from "@/lib/supabase/admin";

export const SOCIAL_LINKS_KEY = "social_links";

export type SocialLinks = {
  instagram_url: string | null;
  tiktok_url: string | null;
  linkedin_url: string | null;
};

export const DEFAULT_SOCIAL_LINKS: SocialLinks = {
  instagram_url: "https://www.instagram.com/carole.questiondallaitement/",
  tiktok_url: "https://www.tiktok.com/@carole_herve",
  linkedin_url: "https://www.linkedin.com/in/carole-herve-ibclc/",
};

const safeJsonParse = (raw: string): Record<string, unknown> => {
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

export const parseSocialLinks = (raw: unknown): SocialLinks => {
  const src =
    typeof raw === "string"
      ? safeJsonParse(raw)
      : raw && typeof raw === "object"
        ? (raw as Record<string, unknown>)
        : {};

  const out = { ...DEFAULT_SOCIAL_LINKS };
  for (const key of Object.keys(DEFAULT_SOCIAL_LINKS) as (keyof SocialLinks)[]) {
    if (!(key in src)) continue;
    const value = src[key];
    if (typeof value === "string" && value.length > 0) {
      out[key] = value;
    } else if (value === null) {
      out[key] = null;
    }
  }
  return out;
};

const TTL_MS = 60_000;
let cached: { value: SocialLinks; at: number } | null = null;

export const invalidateSocialLinksCache = () => {
  cached = null;
};

export const getSocialLinks = async (): Promise<SocialLinks> => {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.value;

  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("platform_settings")
      .select("value")
      .eq("key", SOCIAL_LINKS_KEY)
      .maybeSingle();

    const value = parseSocialLinks(data?.value);
    cached = { value, at: Date.now() };
    return value;
  } catch (e) {
    console.error("[social-links] lecture des reglages echouee", e);
    return DEFAULT_SOCIAL_LINKS;
  }
};

export const saveSocialLinks = async (
  links: SocialLinks,
): Promise<{ error: string | null }> => {
  const supabase = createAdminClient();
  const { error } = await supabase.from("platform_settings").upsert(
    {
      key: SOCIAL_LINKS_KEY,
      value: links as unknown as Record<string, unknown>,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" },
  );

  if (error) return { error: "Erreur lors de l'enregistrement des réseaux sociaux." };

  invalidateSocialLinksCache();
  return { error: null };
};
