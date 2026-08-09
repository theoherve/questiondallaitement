"use server";

import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadPreferences } from "@/lib/notifications/preferences";
import { PREFERENCE_CATEGORIES } from "@/lib/notifications/preference-categories";
import type { NotificationPreferenceKey } from "@/lib/notifications/preference-categories";
import type { ChannelOverrides } from "@/lib/notifications/preferences";
import type { NotificationChannel } from "@/lib/notifications/types";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types";

const CHANNELS: NotificationChannel[] = ["in_app", "email"];

export const getNotificationPreferences =
  async (): Promise<ChannelOverrides> => {
    const user = await getSessionUser();
    if (!user) return {};
    return loadPreferences(user.id);
  };

/**
 * Enregistre un écart au défaut.
 *
 * Les catégories imposées sont refusées **côté serveur**, pas seulement grisées
 * dans l'interface : une server action est appelable directement.
 */
export const setNotificationPreference = async (
  categoryKey: NotificationPreferenceKey,
  channel: NotificationChannel,
  enabled: boolean,
): Promise<ActionResult> => {
  const user = await getSessionUser();
  if (!user) return { success: false, error: "Non authentifié" };

  const category = PREFERENCE_CATEGORIES[categoryKey];
  if (!category) return { success: false, error: "Catégorie inconnue" };
  if (category.forced) {
    return { success: false, error: "Cette catégorie est toujours envoyée" };
  }
  if (!CHANNELS.includes(channel)) {
    return { success: false, error: "Canal inconnu" };
  }

  const { error } = await createAdminClient()
    .from("notification_preferences")
    .upsert(
      {
        user_id: user.id,
        category_key: categoryKey,
        channel,
        enabled,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,category_key,channel" },
    );

  if (error) {
    return { success: false, error: "Erreur lors de l'enregistrement" };
  }

  revalidatePath("/espace-client/profil");
  return { success: true };
};
