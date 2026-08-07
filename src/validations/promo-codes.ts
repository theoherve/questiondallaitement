import { z } from "zod/v4";

const targetSchema = z.object({
  target_type: z.enum([
    "accompagnements_all",
    "formations_all",
    "bookings_all",
    "accompagnement",
    "formation",
    "booking_service",
  ]),
  target_id: z.string().uuid().nullable(),
});

const triggerSchema = z.object({
  trigger_type: z.enum(["formation_purchase", "accompagnement_purchase"]),
  target_id: z.string().uuid().nullable(),
});

export const promoCodeSchema = z
  .object({
    code: z
      .string()
      .min(3, "Le code doit contenir au moins 3 caractères")
      .regex(
        /^[A-Z0-9]+$/,
        "Le code ne peut contenir que des majuscules et des chiffres",
      ),
    label: z.string().optional().nullable(),
    discount_type: z.enum(["percent", "fixed_cents"]),
    discount_value: z.number().int().positive("La remise doit être positive"),
    scope_all: z.boolean().default(true),
    targets: z.array(targetSchema).default([]),
    triggers: z.array(triggerSchema).default([]),
    valid_from: z.string().optional().nullable(),
    valid_until: z.string().optional().nullable(),
    max_redemptions: z.number().int().positive().optional().nullable(),
    max_per_user: z.number().int().positive().default(1),
    min_order_cents: z.number().int().min(0).default(0),
    trigger_delay_hours: z.number().int().positive().optional().nullable(),
    is_active: z.boolean().default(true),
  })
  .refine(
    (data) => data.discount_type !== "percent" || data.discount_value <= 100,
    {
      message: "Une remise en pourcentage ne peut pas dépasser 100",
      path: ["discount_value"],
    },
  )
  .refine((data) => data.scope_all || data.targets.length > 0, {
    message: "Sélectionnez au moins une cible ou cochez « tout le catalogue »",
    path: ["targets"],
  })
  .refine(
    (data) => data.triggers.length === 0 || data.trigger_delay_hours != null,
    {
      message: "Un déclencheur exige un délai en heures",
      path: ["trigger_delay_hours"],
    },
  )
  .refine(
    (data) =>
      !data.valid_from ||
      !data.valid_until ||
      new Date(data.valid_from) < new Date(data.valid_until),
    {
      message: "La fin de validité doit être après le début",
      path: ["valid_until"],
    },
  );

export type PromoCodeInput = z.infer<typeof promoCodeSchema>;
