// ─── Trigger Types ──────────────────────────────────────────

export const ADMIN_WORKFLOW_TRIGGER_TYPES = [
  "recurring_event",
  "formation_enrolled",
  "manual",
] as const;

export type AdminWorkflowTriggerType =
  (typeof ADMIN_WORKFLOW_TRIGGER_TYPES)[number];

// ─── Trigger Configs ────────────────────────────────────────

export type RecurringEventTriggerConfig = {
  recurring_definition_id: string;
};

export type FormationEnrolledTriggerConfig = {
  formation_ids?: string[];
};

export type ManualTriggerConfig = Record<string, never>;

export type AdminWorkflowTriggerConfig =
  | RecurringEventTriggerConfig
  | FormationEnrolledTriggerConfig
  | ManualTriggerConfig;

// ─── Audience Config ────────────────────────────────────────

export type AudienceConfig = {
  label_ids: string[];
  match: "any" | "all";
};

// ─── Step Action Types ──────────────────────────────────────

export const ADMIN_WORKFLOW_ACTION_TYPES = [
  "send_email",
  "add_label",
  "webhook",
] as const;

export type AdminWorkflowActionType =
  (typeof ADMIN_WORKFLOW_ACTION_TYPES)[number];

export type SendEmailStepConfig = {
  subject: string;
  body_html: string;
  template_id?: string | null;
  save_as_template?: boolean;
  template_name?: string;
};

export type AddLabelStepConfig = {
  label_id: string;
};

export type WebhookStepConfig = {
  url: string;
  method?: "GET" | "POST" | "PUT";
};

export type AdminWorkflowStepConfig =
  | SendEmailStepConfig
  | AddLabelStepConfig
  | WebhookStepConfig;

// ─── Recurrence Rule ────────────────────────────────────────

export type RecurrenceRule = {
  frequency: "weekly" | "monthly";
  interval: number;
  day_of_week?: number; // 0=Sun, 1=Mon, ..., 6=Sat
  week_of_month?: number; // 1=first, 2=second, ..., -1=last
};

// ─── Auto-Assign Rule (labels) ──────────────────────────────

export type AutoAssignRule = {
  trigger: "formation_enrolled";
  formation_ids?: string[];
};

// ─── Domain Objects ─────────────────────────────────────────

export type AdminWorkflow = {
  id: string;
  name: string;
  description: string | null;
  trigger_type: AdminWorkflowTriggerType;
  trigger_config: AdminWorkflowTriggerConfig;
  audience_config: AudienceConfig;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type AdminWorkflowStep = {
  id: string;
  workflow_id: string;
  position: number;
  delay_days: number;
  send_time: string;
  action_type: AdminWorkflowActionType;
  action_config: AdminWorkflowStepConfig;
  created_at: string;
};

export type ScheduledWorkflowAction = {
  id: string;
  workflow_id: string;
  step_id: string;
  profile_id: string;
  anchor_event_id: string | null;
  scheduled_for: string;
  status: "pending" | "executed" | "failed" | "skipped";
  result: Record<string, unknown> | null;
  executed_at: string | null;
  created_at: string;
};

export type AdminWorkflowLog = {
  id: string;
  workflow_id: string;
  trigger_data: Record<string, unknown> | null;
  actions_scheduled: number;
  actions_executed: number;
  actions_failed: number;
  status: "pending" | "in_progress" | "completed" | "partial";
  created_at: string;
  completed_at: string | null;
};

export type Label = {
  id: string;
  name: string;
  slug: string;
  color: string;
  auto_assign_rule: AutoAssignRule | null;
  created_at: string;
  updated_at: string;
};

export type RecurringEventDefinition = {
  id: string;
  title: string;
  slug_prefix: string;
  description: string | null;
  consultant_id: string;
  type: "online" | "in_person" | "hybrid";
  location: string | null;
  duration_minutes: number;
  time_of_day: string;
  recurrence_rule: RecurrenceRule;
  timezone: string;
  max_participants: number | null;
  price_cents: number;
  currency: string;
  is_active: boolean;
  generate_ahead_days: number;
  last_generated_until: string | null;
  created_at: string;
  updated_at: string;
};

// ─── Template variables available in emails ─────────────────

export const WORKFLOW_EMAIL_VARIABLES = [
  "first_name",
  "last_name",
  "email",
  "event_title",
  "event_date",
  "event_time",
  "event_location",
  "zoom_join_url",
  "replay_url",
] as const;
