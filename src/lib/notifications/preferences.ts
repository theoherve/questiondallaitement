import type { NotificationCategory, NotificationChannel } from "./types";

export type ChannelOverrides = Partial<Record<NotificationChannel, boolean>>;

/**
 * Valeur de départ d'une catégorie, canal par canal. La table des préférences
 * (tranche 2) ne stockera que les écarts à ces valeurs, ce qui évite tout
 * backfill sur les profils existants et permettra au digest de démarrer
 * désactivé pendant que le reste du marketing démarre activé.
 */
export const CATEGORY_DEFAULTS: Record<
  NotificationCategory,
  Record<NotificationChannel, boolean>
> = {
  transactional: { in_app: true, email: true },
  system: { in_app: true, email: true },
  marketing: { in_app: true, email: true },
};

/**
 * Les catégories imposées ne consultent jamais les préférences : le
 * transactionnel n'a pas besoin de consentement, et couper une alerte système
 * reviendrait à se priver du signal d'une panne.
 */
const FORCED: NotificationCategory[] = ["transactional", "system"];

/**
 * Couture des préférences utilisateur. Aujourd'hui `overrides` est toujours
 * vide ; la tranche 2 l'alimentera depuis `notification_preferences` sans avoir
 * à toucher `notify()`.
 */
export const resolveChannels = (
  category: NotificationCategory,
  declared: NotificationChannel[],
  overrides: ChannelOverrides = {}
): NotificationChannel[] => {
  if (FORCED.includes(category)) return declared;
  return declared.filter((channel) => {
    const override = overrides[channel];
    return override ?? CATEGORY_DEFAULTS[category][channel];
  });
};
