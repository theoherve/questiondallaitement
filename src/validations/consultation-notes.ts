import { z } from "zod/v4";

/**
 * Validation des champs saisis par la consultante. Volontairement permissive
 * sur les textes (une fiche se sauvegarde en brouillon même incomplète) — le
 * garde-fou "champs obligatoires non vides" ne s'applique qu'à la
 * publication, côté server action (voir publishConsultationNote).
 */
export const consultationNoteFieldsSchema = z.object({
  child_id: z.string().uuid("Enfant invalide").nullable(),
  motif: z.string().max(4000, "Maximum 4000 caractères"),
  antecedents_medicaux: z.boolean(),
  antecedents_medicaux_detail: z.string().max(2000).nullable(),
  antecedents_chirurgicaux: z.boolean(),
  antecedents_chirurgicaux_detail: z.string().max(2000).nullable(),
  allergies: z.boolean(),
  allergies_detail: z.string().max(2000).nullable(),
  traitements_en_cours: z.boolean(),
  traitements_en_cours_detail: z.string().max(2000).nullable(),
  observation: z.string().max(8000, "Maximum 8000 caractères"),
  conclusion: z.string().max(4000, "Maximum 4000 caractères"),
  notes_internes: z.string().max(4000).nullable(),
});

export type ConsultationNoteFieldsInput = z.infer<
  typeof consultationNoteFieldsSchema
>;
