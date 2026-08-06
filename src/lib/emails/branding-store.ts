import { createAdminClient } from "@/lib/supabase/admin";
import {
  DEFAULT_EMAIL_BRANDING,
  parseEmailBranding,
  type EmailBranding,
} from "./branding";

/** Cle unique dans `platform_settings` (JSONB). */
export const EMAIL_BRANDING_KEY = "email_branding";

/**
 * Cache memoire court. Chaque email envoye traverse `applyEmailBranding` ; sans
 * cache, un envoi en boucle (rappels, migration) ferait une requete par
 * destinataire pour une donnee qui change quelques fois par an.
 */
const TTL_MS = 60_000;
let cached: { value: EmailBranding; at: number } | null = null;

export const invalidateEmailBrandingCache = () => {
  cached = null;
};

export const getEmailBranding = async (): Promise<EmailBranding> => {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.value;

  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("platform_settings")
      .select("value")
      .eq("key", EMAIL_BRANDING_KEY)
      .maybeSingle();

    const value = parseEmailBranding(data?.value);
    cached = { value, at: Date.now() };
    return value;
  } catch (e) {
    // Un email sans logo reste un email envoye ; une exception ici bloquerait
    // une confirmation de reservation ou une facture.
    console.error("[email-branding] lecture des reglages echouee", e);
    return DEFAULT_EMAIL_BRANDING;
  }
};

export const saveEmailBranding = async (
  branding: EmailBranding,
): Promise<{ error: string | null }> => {
  const supabase = createAdminClient();
  const { error } = await supabase.from("platform_settings").upsert(
    {
      key: EMAIL_BRANDING_KEY,
      value: branding as unknown as Record<string, unknown>,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" },
  );

  if (error) return { error: "Erreur lors de l'enregistrement de l'identite email." };

  invalidateEmailBrandingCache();
  return { error: null };
};
