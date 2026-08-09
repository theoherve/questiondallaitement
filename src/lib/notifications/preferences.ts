import { createAdminClient } from "@/lib/supabase/admin";
import { PREFERENCE_CATEGORIES } from "./preference-categories";
import type { NotificationPreferenceKey } from "./preference-categories";
import type { NotificationChannel } from "./types";

/** Écarts au défaut, indexés `categorie:canal`. */
export type ChannelOverrides = Record<string, boolean>;

export const overrideKey = (
  category: NotificationPreferenceKey,
  channel: NotificationChannel
): string => `${category}:${channel}`;

/**
 * Charge les écarts au défaut d'une utilisatrice.
 *
 * Un échec de lecture renvoie un objet vide plutôt qu'une erreur : mieux vaut
 * envoyer selon les défauts que perdre la notification. L'inverse, taire une
 * notification sur une panne de lecture, serait pire.
 */
export const loadPreferences = async (
  userId: string
): Promise<ChannelOverrides> => {
  const { data, error } = await createAdminClient()
    .from("notification_preferences")
    .select("category_key, channel, enabled")
    .eq("user_id", userId);

  if (error) {
    console.error(`loadPreferences(${userId}) a échoué :`, error);
    return {};
  }

  const overrides: ChannelOverrides = {};
  for (const row of data ?? []) {
    overrides[`${row.category_key}:${row.channel}`] = row.enabled;
  }
  return overrides;
};

/**
 * Canaux effectifs d'un envoi. Ne peut qu'enlever des canaux à ceux que
 * l'événement déclare : une préférence ne fabrique pas un canal que le
 * catalogue n'a pas prévu.
 */
export const resolveChannels = (
  preferenceKey: NotificationPreferenceKey,
  declared: NotificationChannel[],
  overrides: ChannelOverrides = {}
): NotificationChannel[] => {
  const category = PREFERENCE_CATEGORIES[preferenceKey];
  if (category.forced) return declared;

  return declared.filter((channel) => {
    const override = overrides[overrideKey(preferenceKey, channel)];
    return override ?? category.defaults[channel];
  });
};
