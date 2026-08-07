export const AUTOMATION_TRIGGER_TYPES = [
  "formation_purchased",
  "booking_confirmed",
  "event_registered",
  "delay_after_event",
] as const;

export type AutomationTriggerType = (typeof AUTOMATION_TRIGGER_TYPES)[number];

export const AUTOMATION_ACTION_TYPES = [
  "send_email",
  "add_crm_tag",
  "webhook",
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

export type AutomationAction =
  | SendEmailAction
  | AddCrmTagAction
  | WebhookAction;

export type AccompagnementPurchasedConfig = {
  formation_ids?: string[];
};

export type BookingConfirmedConfig = {
  consultation_type_ids?: string[];
};

export type EventRegisteredConfig = {
  event_ids?: string[];
};

export type DelayAfterEventConfig = {
  event_ids?: string[];
  delay_days: number;
};

export type AutomationTriggerConfig =
  | AccompagnementPurchasedConfig
  | BookingConfirmedConfig
  | EventRegisteredConfig
  | DelayAfterEventConfig;

export type TriggerData = {
  client_id: string;
  client_email?: string;
  client_name?: string;
  formation_id?: string;
  formation_title?: string;
  booking_id?: string;
  consultation_type_id?: string;
  consultation_type_title?: string;
  event_id?: string;
  event_title?: string;
  event_starts_at?: string;
  [key: string]: unknown;
};
