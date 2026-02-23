import { z } from "zod/v4";

export const bookingSchema = z.object({
  consultant_id: z.string().uuid(),
  consultation_type_id: z.string().uuid(),
  starts_at: z.string().datetime(),
  notes: z.string().max(500).optional(),
});

export const cancellationSchema = z.object({
  booking_id: z.string().uuid(),
  reason: z.string().min(1, "Veuillez indiquer une raison").max(500),
});

export const availabilitySchema = z.object({
  day_of_week: z.number().int().min(0).max(6),
  start_time: z.string().regex(/^\d{2}:\d{2}$/, "Format HH:MM requis"),
  end_time: z.string().regex(/^\d{2}:\d{2}$/, "Format HH:MM requis"),
});

export const consultationTypeSchema = z.object({
  title: z.string().min(3, "Le titre doit contenir au moins 3 caractères"),
  description: z.string().optional(),
  duration_minutes: z.number().int().min(15).max(480),
  price_cents: z.number().int().min(0),
  currency: z.string().default("eur"),
  is_online: z.boolean().default(true),
  buffer_minutes: z.number().int().min(0).max(120).default(15),
});

export type BookingInput = z.infer<typeof bookingSchema>;
export type CancellationInput = z.infer<typeof cancellationSchema>;
export type AvailabilityInput = z.infer<typeof availabilitySchema>;
export type ConsultationTypeInput = z.infer<typeof consultationTypeSchema>;
