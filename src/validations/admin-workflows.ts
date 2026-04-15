import { z } from "zod";
import {
  ADMIN_WORKFLOW_TRIGGER_TYPES,
  ADMIN_WORKFLOW_ACTION_TYPES,
} from "@/lib/admin-workflows/types";

// ─── Labels ─────────────────────────────────────────────────

export const labelSchema = z.object({
  name: z.string().min(2, "Nom trop court").max(50, "Nom trop long"),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/, "Slug invalide"),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Couleur invalide"),
  auto_assign_rule: z
    .object({
      trigger: z.literal("formation_enrolled"),
      formation_ids: z.array(z.string().uuid()).optional(),
    })
    .nullable()
    .optional(),
});

export type LabelInput = z.infer<typeof labelSchema>;

// ─── Recurrence Rule ────────────────────────────────────────

export const recurrenceRuleSchema = z.object({
  frequency: z.enum(["weekly", "monthly"]),
  interval: z.number().int().min(1).max(12).default(1),
  day_of_week: z.number().int().min(0).max(6).optional(),
  week_of_month: z.number().int().min(-1).max(5).optional(),
});

// ─── Recurring Event Definition ─────────────────────────────

export const recurringEventDefinitionSchema = z.object({
  title: z.string().min(3, "Titre trop court"),
  slug_prefix: z
    .string()
    .min(2)
    .regex(/^[a-z0-9-]+$/, "Slug invalide"),
  description: z.string().nullable().optional(),
  consultant_id: z.string().uuid(),
  type: z.enum(["online", "in_person", "hybrid"]).default("online"),
  location: z.string().nullable().optional(),
  duration_minutes: z.number().int().min(15).max(480).default(60),
  time_of_day: z.string().regex(/^\d{2}:\d{2}$/, "Format HH:MM requis"),
  recurrence_rule: recurrenceRuleSchema,
  timezone: z.string().default("Europe/Paris"),
  max_participants: z.number().int().min(1).nullable().optional(),
  price_cents: z.number().int().min(0).default(0),
  currency: z.string().default("eur"),
  is_active: z.boolean().default(true),
  generate_ahead_days: z.number().int().min(7).max(365).default(45),
});

export type RecurringEventDefinitionInput = z.infer<
  typeof recurringEventDefinitionSchema
>;

// ─── Workflow Step ──────────────────────────────────────────

const sendEmailStepConfigSchema = z
  .object({
    subject: z.string().min(1, "Sujet requis"),
    body_html: z.string().default(""),
    body_design: z.record(z.string(), z.unknown()).nullable().optional(),
    template_id: z.string().uuid().nullable().optional(),
    save_as_template: z.boolean().optional(),
    template_name: z.string().optional(),
  })
  .refine(
    (d) => (d.body_design && Object.keys(d.body_design).length > 0) || d.body_html.length >= 1,
    { message: "Contenu requis", path: ["body_html"] },
  );

const addLabelStepConfigSchema = z.object({
  label_id: z.string().uuid("Label requis"),
});

const webhookStepConfigSchema = z.object({
  url: z.string().url("URL invalide"),
  method: z.enum(["GET", "POST", "PUT"]).optional(),
});

export const adminWorkflowStepSchema = z.object({
  position: z.number().int().min(0),
  delay_days: z.number().int().min(-30).max(30),
  send_time: z
    .string()
    .regex(/^\d{2}:\d{2}(:\d{2})?$/, "Format HH:MM requis")
    .transform((v) => v.slice(0, 5))
    .default("09:00"),
  action_type: z.enum(ADMIN_WORKFLOW_ACTION_TYPES),
  action_config: z.union([
    sendEmailStepConfigSchema,
    addLabelStepConfigSchema,
    webhookStepConfigSchema,
  ]),
});

export type AdminWorkflowStepInput = z.infer<typeof adminWorkflowStepSchema>;

// ─── Workflow ───────────────────────────────────────────────

export const adminWorkflowSchema = z.object({
  name: z.string().min(2, "Nom trop court").max(100, "Nom trop long"),
  description: z.string().nullable().optional(),
  trigger_type: z.enum(ADMIN_WORKFLOW_TRIGGER_TYPES),
  trigger_config: z.record(z.string(), z.unknown()).default({}),
  audience_config: z.object({
    label_ids: z
      .array(z.string().uuid())
      .min(1, "Au moins un label requis"),
    match: z.enum(["any", "all"]),
  }),
  steps: z
    .array(adminWorkflowStepSchema)
    .min(1, "Au moins une étape requise"),
  is_active: z.boolean().default(false),
});

export type AdminWorkflowInput = z.infer<typeof adminWorkflowSchema>;
