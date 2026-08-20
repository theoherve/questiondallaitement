import type { FormationCategory } from "@/config/formation-categories";

// ─── Trigger Types ──────────────────────────────────────────

export const ADMIN_WORKFLOW_TRIGGER_TYPES = [
  "recurring_formation",
  "accompagnement_enrolled",
  "manual",
] as const;

export type AdminWorkflowTriggerType =
  (typeof ADMIN_WORKFLOW_TRIGGER_TYPES)[number];

// ─── Trigger Configs ────────────────────────────────────────

export type RecurringFormationTriggerConfig = {
  recurring_definition_id: string;
};

export type AccompagnementEnrolledTriggerConfig = {
  accompagnement_ids?: string[];
};

export type ManualTriggerConfig = Record<string, never>;

export type AdminWorkflowTriggerConfig =
  | RecurringFormationTriggerConfig
  | AccompagnementEnrolledTriggerConfig
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
  /** Maily block editor JSON. When present, takes precedence over body_html. */
  body_design?: Record<string, unknown> | null;
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
  trigger: "accompagnement_enrolled";
  accompagnement_ids?: string[];
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
  anchor_formation_id: string | null;
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

export type RecurringFormationDefinition = {
  id: string;
  title: string;
  slug_prefix: string;
  description: string | null;
  consultant_id: string;
  type: "online" | "in_person" | "hybrid";
  category: FormationCategory;
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
  "formation_title",
  "formation_date",
  "formation_time",
  "formation_location",
  "zoom_join_url",
  "replay_url",
  // Injected by the transactional senders (send.ts) when the matching
  // template is used — exposed here so the block editor's @ menu suggests
  // them in workflow steps too.
  "accompagnement_url",
  "dashboard_url",
] as const;
