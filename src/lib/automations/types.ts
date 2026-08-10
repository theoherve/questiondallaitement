export const AUTOMATION_TRIGGER_TYPES = [
  "accompagnement_purchased",
  "booking_confirmed",
  "formation_registered",
  "delay_after_formation",
] as const;

export type AutomationTriggerType = (typeof AUTOMATION_TRIGGER_TYPES)[number];

export const AUTOMATION_ACTION_TYPES = [
  "send_email",
  "add_crm_tag",
  "webhook",
  "send_notification",
] as const;

export type AutomationActionType = (typeof AUTOMATION_ACTION_TYPES)[number];

export type SendEmailAction = {
  type: "send_email";
  subject: string;
  body_html: string;
};

export type AddCrmTagAction = {
  type: "add_crm_tag";
  tag_id: string;
};

export type WebhookAction = {
  type: "webhook";
  url: string;
  method?: "GET" | "POST" | "PUT";
};

export type SendNotificationAction = {
  type: "send_notification";
  title: string;
  body: string;
  /** Lien interne facultatif, vers l'espace client. */
  href?: string;
};

export type AutomationAction =
  | SendEmailAction
  | AddCrmTagAction
  | WebhookAction
  | SendNotificationAction;

export type AccompagnementPurchasedConfig = {
  accompagnement_ids?: string[];
};

export type BookingConfirmedConfig = {
  consultation_type_ids?: string[];
};

export type FormationRegisteredConfig = {
  formation_ids?: string[];
};

export type DelayAfterFormationConfig = {
  formation_ids?: string[];
  delay_days: number;
};

export type AutomationTriggerConfig =
  | AccompagnementPurchasedConfig
  | BookingConfirmedConfig
  | FormationRegisteredConfig
  | DelayAfterFormationConfig;

export type TriggerData = {
  client_id: string;
  client_email?: string;
  client_name?: string;
  accompagnement_id?: string;
  accompagnement_title?: string;
  booking_id?: string;
  consultation_type_id?: string;
  consultation_type_title?: string;
  formation_id?: string;
  formation_title?: string;
  event_starts_at?: string;
  [key: string]: unknown;
};
