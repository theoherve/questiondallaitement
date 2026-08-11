import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Cle unique dans `platform_settings` (JSONB), meme pattern que
 * `email_branding` (src/lib/emails/branding-store.ts).
 */
export const ANNOUNCEMENT_BANNER_KEY = "announcement_banner";

export type AnnouncementBanner = {
  enabled: boolean;
  message: string;
  link_url: string | null;
  link_label: string;
  start_date: string | null;
  end_date: string | null;
};

export const DEFAULT_ANNOUNCEMENT_BANNER: AnnouncementBanner = {
  enabled: false,
  message: "",
  link_url: null,
  link_label: "",
  start_date: null,
  end_date: null,
};

const safeJsonParse = (raw: string): Record<string, unknown> => {
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

/**
 * Fusionne une valeur brute (potentiellement partielle ou mal typee) avec les
 * valeurs par defaut. Toute cle inconnue ou mal typee retombe sur le defaut
 * plutot que de faire echouer le rendu des pages publiques.
 */
export const parseAnnouncementBanner = (raw: unknown): AnnouncementBanner => {
  const src =
    typeof raw === "string"
      ? safeJsonParse(raw)
      : raw && typeof raw === "object"
        ? (raw as Record<string, unknown>)
        : {};

  const out = { ...DEFAULT_ANNOUNCEMENT_BANNER };
  for (const key of Object.keys(DEFAULT_ANNOUNCEMENT_BANNER) as (keyof AnnouncementBanner)[]) {
    const value = src[key];
    const fallback = DEFAULT_ANNOUNCEMENT_BANNER[key];
    if (value === undefined) continue;
    if (typeof fallback === "boolean" && typeof value === "boolean") {
      (out as Record<string, unknown>)[key] = value;
    } else if (
      typeof value === "string" &&
      (typeof fallback === "string" || fallback === null)
    ) {
      (out as Record<string, unknown>)[key] = value;
    } else if (value === null && fallback === null) {
      (out as Record<string, unknown>)[key] = null;
    }
  }
  return out;
};

export const isAnnouncementBannerActive = (
  banner: AnnouncementBanner,
  now: Date = new Date(),
): boolean => {
  if (!banner.enabled) return false;
  if (banner.start_date && now < new Date(banner.start_date)) return false;
  if (banner.end_date) {
    const end = new Date(banner.end_date);
    end.setHours(23, 59, 59, 999);
    if (now > end) return false;
  }
  return true;
};

export const getAnnouncementBanner = async (): Promise<AnnouncementBanner> => {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("platform_settings")
      .select("value")
      .eq("key", ANNOUNCEMENT_BANNER_KEY)
      .maybeSingle();

    return parseAnnouncementBanner(data?.value);
  } catch (e) {
    // Une panne de lecture ici ne doit jamais casser le rendu des pages
    // publiques : on retombe sur "pas de bandeau".
    console.error("[announcement-banner] lecture des reglages echouee", e);
    return DEFAULT_ANNOUNCEMENT_BANNER;
  }
};

export const saveAnnouncementBanner = async (
  banner: AnnouncementBanner,
): Promise<{ error: string | null }> => {
  const supabase = createAdminClient();
  const { error } = await supabase.from("platform_settings").upsert(
    {
      key: ANNOUNCEMENT_BANNER_KEY,
      value: banner as unknown as Record<string, unknown>,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" },
  );

  if (error) return { error: "Erreur lors de l'enregistrement du bandeau." };
  return { error: null };
};
