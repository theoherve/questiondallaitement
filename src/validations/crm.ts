import { z } from "zod/v4";

// ─── CRM Notes ──────────────────────────────────────────────

export const crmNoteSchema = z.object({
  content: z.string().min(1, "Le contenu de la note est requis"),
  client_id: z.string().uuid("Client requis"),
});

export type CrmNoteInput = z.infer<typeof crmNoteSchema>;

// ─── CRM Tags ───────────────────────────────────────────────

export const crmTagSchema = z.object({
  name: z
    .string()
    .min(1, "Le nom du tag est requis")
    .max(50, "Maximum 50 caractères"),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Format couleur hexadécimal requis (#RRGGBB)")
    .optional()
    .nullable(),
});

export type CrmTagInput = z.infer<typeof crmTagSchema>;

// ─── CRM Segments ───────────────────────────────────────────

const NUMERIC_SEGMENT_FIELDS = [
  "booking_count",
  "total_spent_cents",
  "accompagnement_count",
  "formation_count",
  "inactive_days",
  "days_since_registration",
] as const;

const SEGMENT_OPS = [">=", "<=", "=", "!="] as const;
/** Un libellé et une souscription se comparent, ils ne s'ordonnent pas. */
const EQUALITY_OPS = ["=", "!="] as const;

export const segmentConditionSchema = z.discriminatedUnion("field", [
  z.object({
    field: z.enum(NUMERIC_SEGMENT_FIELDS),
    op: z.enum(SEGMENT_OPS),
    value: z.number().min(0),
  }),
  z.object({
    field: z.literal("has_tag"),
    op: z.enum(EQUALITY_OPS),
    value: z.uuid("Libellé invalide"),
  }),
  z.object({
    field: z.literal("has_accompagnement"),
    op: z.enum(EQUALITY_OPS),
    value: z.boolean(),
  }),
]);

export const crmSegmentSchema = z.object({
  name: z
    .string()
    .min(1, "Le nom du segment est requis")
    .max(100, "Maximum 100 caractères"),
  description: z.string().max(500, "Maximum 500 caractères").optional().nullable(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Format couleur hexadécimal requis (#RRGGBB)")
    .optional()
    .nullable(),
  conditions: z
    .array(segmentConditionSchema)
    .min(1, "Au moins une condition est requise"),
});

export type CrmSegmentInput = z.infer<typeof crmSegmentSchema>;

// ─── Accompagnement Collaborators ────────────────────────────────

export const accompagnementCollaboratorSchema = z.object({
  consultant_id: z.string().uuid("Consultante requise"),
  revenue_share: z
    .number()
    .min(0, "Le pourcentage ne peut pas être négatif")
    .max(100, "Le pourcentage ne peut pas dépasser 100%"),
});

export type AccompagnementCollaboratorInput = z.infer<
  typeof accompagnementCollaboratorSchema
>;
