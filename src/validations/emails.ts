import { z } from "zod";

// ─── Email Templates ────────────────────────────────────────

export const emailTemplateSchema = z
  .object({
    name: z
      .string()
      .min(2, "Le nom doit contenir au moins 2 caractères")
      .max(100, "Le nom ne peut pas dépasser 100 caractères"),
    subject: z
      .string()
      .min(2, "L'objet doit contenir au moins 2 caractères")
      .max(200, "L'objet ne peut pas dépasser 200 caractères"),
    body_html: z.string().default(""),
    body_design: z.record(z.string(), z.unknown()).nullable().optional(),
    type: z.enum(["transactional", "marketing"]),
    variables: z.array(z.string()).default([]),
  })
  .refine(
    (d) => (d.body_design && Object.keys(d.body_design).length > 0) || d.body_html.length >= 10,
    { message: "Le contenu est trop court", path: ["body_html"] },
  );

export type EmailTemplateInput = z.infer<typeof emailTemplateSchema>;

// ─── Email Campaigns ────────────────────────────────────────

export const emailCampaignSchema = z
  .object({
    name: z
      .string()
      .min(2, "Le nom doit contenir au moins 2 caractères")
      .max(100, "Le nom ne peut pas dépasser 100 caractères"),
    subject: z
      .string()
      .min(2, "L'objet doit contenir au moins 2 caractères")
      .max(200, "L'objet ne peut pas dépasser 200 caractères"),
    body_html: z.string().default(""),
    body_design: z.record(z.string(), z.unknown()).nullable().optional(),
    recipient_list_ids: z
      .array(z.number().int().positive())
      .min(1, "Sélectionnez au moins une liste de destinataires"),
    scheduled_at: z.string().nullable().optional(),
  })
  .refine(
    (d) => (d.body_design && Object.keys(d.body_design).length > 0) || d.body_html.length >= 10,
    { message: "Le contenu de l'email est trop court", path: ["body_html"] },
  );

export type EmailCampaignInput = z.infer<typeof emailCampaignSchema>;

// ─── Consultant Brevo List assignment ───────────────────────

export const consultantBrevoListSchema = z.object({
  consultant_id: z.string().uuid(),
  brevo_list_id: z.number().int().positive("L'ID de liste Brevo est requis"),
  list_name: z.string().min(1, "Le nom de la liste est requis"),
});

export type ConsultantBrevoListInput = z.infer<
  typeof consultantBrevoListSchema
>;
