import { z } from "zod";
import { AUTOMATION_TRIGGER_TYPES, AUTOMATION_ACTION_TYPES } from "@/lib/automations/types";

const sendEmailActionSchema = z.object({
  type: z.literal("send_email"),
  subject: z.string().min(1, "Sujet requis"),
  body_html: z.string().min(1, "Contenu requis"),
});

const addCrmTagActionSchema = z.object({
  type: z.literal("add_crm_tag"),
  tag_id: z.string().uuid("Tag requis"),
});

const webhookActionSchema = z.object({
  type: z.literal("webhook"),
  url: z.string().url("URL invalide"),
  method: z.enum(["GET", "POST", "PUT"]).optional(),
});

export const automationActionSchema = z.discriminatedUnion("type", [
  sendEmailActionSchema,
  addCrmTagActionSchema,
  webhookActionSchema,
]);

export const automationSchema = z
  .object({
    name: z
      .string()
      .min(2, "Nom trop court")
      .max(100, "Nom trop long"),
    trigger_type: z.enum(AUTOMATION_TRIGGER_TYPES),
    trigger_config: z.record(z.string(), z.unknown()).default({}),
    actions: z.array(automationActionSchema).min(1, "Au moins une action requise"),
    is_active: z.boolean().default(false),
  })
  .refine(
    (data) => {
      if (data.trigger_type === "delay_after_event") {
        const cfg = data.trigger_config as { delay_days?: number };
        return typeof cfg.delay_days === "number" && cfg.delay_days >= 1;
      }
      return true;
    },
    { message: "Indiquez le nombre de jours pour delay_after_event", path: ["trigger_config"] }
  );

export type AutomationInput = z.infer<typeof automationSchema>;
