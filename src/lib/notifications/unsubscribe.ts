import { createAdminClient } from "@/lib/supabase/admin";
import { siteConfig } from "@/config/site";
import { PREFERENCE_CATEGORIES } from "./preference-categories";
import type { NotificationPreferenceKey } from "./preference-categories";

export const buildUnsubscribeUrl = (
  token: string,
  categoryKey: NotificationPreferenceKey
): string =>
  `${siteConfig.url}/notifications/desinscription?token=${token}&categorie=${categoryKey}`;

/**
 * Coupe le canal email d'une catégorie, depuis un lien d'email, donc sans
 * session.
 *
 * Le jeton est opaque et unique par profil : une URL portant l'identifiant en
 * clair permettrait de désabonner autrui, comme l'expliquait déjà la migration
 * de la newsletter (`00060`).
 *
 * Seul l'email est coupé : quelqu'un qui se désinscrit d'un email veut moins de
 * courrier, pas voir disparaître ses notifications du site.
 */
export const unsubscribeByToken = async (
  token: string,
  categoryKey: string
): Promise<{ ok: boolean; label?: string }> => {
  const category =
    PREFERENCE_CATEGORIES[categoryKey as NotificationPreferenceKey];
  if (!category || category.forced) return { ok: false };

  const supabase = createAdminClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("notification_unsubscribe_token", token)
    .maybeSingle();

  if (!profile) return { ok: false };

  const { error } = await supabase.from("notification_preferences").upsert(
    {
      user_id: profile.id,
      category_key: categoryKey,
      channel: "email",
      enabled: false,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,category_key,channel" }
  );

  if (error) return { ok: false };
  return { ok: true, label: category.label };
};
