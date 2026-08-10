export { notify } from "./notify";
export { getRoleRecipients } from "./recipients";
export { NOTIFICATION_CATALOG } from "./catalog";
export { resolveChannels, loadPreferences } from "./preferences";
export {
  PREFERENCE_CATEGORIES,
  CLIENT_PREFERENCE_CATEGORIES,
} from "./preference-categories";
export type { NotificationPreferenceKey } from "./preference-categories";
export type {
  NotificationChannel,
  NotificationDataMap,
  NotificationEvent,
  NotificationRecipient,
} from "./types";
export { resolveAudience } from "./audience";
export type { AudienceRule } from "./audience";
