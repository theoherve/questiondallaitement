"use server";

import { getSupabaseAndUser } from "@/lib/supabase/server-auth";
import type { PublishedConsultationNote } from "@/types/database";

const PUBLIC_COLUMNS =
  "id, booking_id, client_id, child_id, motif, antecedents_medicaux, antecedents_medicaux_detail, antecedents_chirurgicaux, antecedents_chirurgicaux_detail, allergies, allergies_detail, traitements_en_cours, traitements_en_cours_detail, observation, conclusion, status, published_at, created_at, updated_at, bookings(starts_at)";

/** Fiche publiée, avec la date du rendez-vous (bookings.starts_at) pour l'affichage et le tri. */
export type PublishedConsultationNoteWithBookingDate = PublishedConsultationNote & {
  booking_starts_at: string;
};

/**
 * Ne prend aucun paramètre : le seul filtre est auth.uid() côté serveur, rien
 * à falsifier depuis l'appelant. Sélectionne explicitement les colonnes
 * publiques — notes_internes n'est jamais chargé, pas juste caché en JS.
 * Le tri et l'affichage suivent la date du rendez-vous (bookings.starts_at),
 * pas la date de création de la ligne.
 */
export const getMyPublishedConsultationNotes = async (): Promise<
  PublishedConsultationNoteWithBookingDate[]
> => {
  const { supabase, user } = await getSupabaseAndUser();

  const { data } = await supabase
    .from("consultation_notes")
    .select(PUBLIC_COLUMNS)
    .eq("client_id", user.id)
    .eq("status", "published")
    .order("starts_at", { ascending: false, referencedTable: "bookings" });

  return (
    (data as unknown as (PublishedConsultationNote & {
      bookings: { starts_at: string } | null;
    })[] | null) ?? []
  ).map(({ bookings, ...note }) => ({
    ...note,
    booking_starts_at: bookings?.starts_at ?? "",
  }));
};
