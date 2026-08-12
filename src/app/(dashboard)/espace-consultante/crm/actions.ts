"use server";

import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { crmNoteSchema, crmTagSchema } from "@/validations/crm";
import { weightMeasurementSchema } from "@/validations/children";
import {
  consultationNoteFieldsSchema,
  type ConsultationNoteFieldsInput,
} from "@/validations/consultation-notes";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionResult } from "@/types";
import type { Child, WeightMeasurement, ConsultationNote } from "@/types/database";

const requireConsultant = async () => {
  const user = await getSessionUser();
  if (!user || (!user.roles.includes("consultant") && !user.roles.includes("admin")))
    redirect("/connexion");
  return user;
};

// ─── Score helpers ──────────────────────────────────────────

function computeClientScore({
  completedBookings,
  totalSpentCents,
  formationsEnrolled,
  eventsAttended,
  inactiveDays,
}: {
  completedBookings: number;
  totalSpentCents: number;
  formationsEnrolled: number;
  eventsAttended: number;
  inactiveDays: number;
}): number {
  const base =
    Math.min(40, completedBookings * 15) +
    Math.min(25, totalSpentCents / 4000) +
    Math.min(20, formationsEnrolled * 10) +
    Math.min(15, eventsAttended * 5);

  const recency =
    inactiveDays >= 180 ? 0.5 : inactiveDays >= 90 ? 0.75 : 1.0;

  return Math.max(0, Math.min(100, Math.round(base * recency)));
}

// ─── Contacts ───────────────────────────────────────────────

export type CrmContact = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  avatar_url: string | null;
  bookings_count: number;
  enrollments_count: number;
  tags: { id: string; name: string; color: string | null }[];
  score: number;
};

export const getContacts = async (params?: {
  q?: string;
  tag_id?: string;
}): Promise<CrmContact[]> => {
  const user = await requireConsultant();
  const supabase = createAdminClient();

  // Get unique client IDs from bookings and formation enrollments for this consultant
  const [bookingsRes, enrollmentsRes] = await Promise.all([
    supabase
      .from("bookings")
      .select("client_id, starts_at")
      .eq("consultant_id", user.id)
      .not("status", "eq", "cancelled"),
    supabase
      .from("accompagnement_enrollments")
      .select("client_id, accompagnement_id")
      .in(
        "accompagnement_id",
        (
          await supabase
            .from("accompagnements")
            .select("id")
            .eq("consultant_id", user.id)
        ).data?.map((f) => f.id) ?? [],
      ),
  ]);

  const bookingClientIds = (bookingsRes.data ?? []).map((b) => b.client_id);
  const enrollmentClientIds = (enrollmentsRes.data ?? []).map(
    (e) => e.client_id,
  );
  const allClientIds = [
    ...new Set([...bookingClientIds, ...enrollmentClientIds]),
  ];

  if (allClientIds.length === 0) return [];

  // Filter by tag if requested
  let filteredClientIds = allClientIds;
  if (params?.tag_id) {
    const { data: taggedClients } = await supabase
      .from("crm_contact_tags")
      .select("client_id")
      .eq("tag_id", params.tag_id)
      .eq("consultant_id", user.id)
      .in("client_id", allClientIds);

    filteredClientIds = (taggedClients ?? []).map((t) => t.client_id);
    if (filteredClientIds.length === 0) return [];
  }

  // Load profiles
  let profileQuery = supabase
    .from("profiles")
    .select("id, first_name, last_name, email, avatar_url")
    .in("id", filteredClientIds)
    .order("last_name", { ascending: true });

  if (params?.q) {
    profileQuery = profileQuery.or(
      `first_name.ilike.%${params.q}%,last_name.ilike.%${params.q}%,email.ilike.%${params.q}%`,
    );
  }

  const { data: profiles } = await profileQuery;
  if (!profiles?.length) return [];

  // Load tags assigned by this consultant
  const { data: contactTags } = await supabase
    .from("crm_contact_tags")
    .select("client_id, crm_tags(id, name, color)")
    .eq("consultant_id", user.id)
    .in(
      "client_id",
      profiles.map((p) => p.id),
    );

  const tagsByClient = new Map<
    string,
    { id: string; name: string; color: string | null }[]
  >();
  for (const ct of contactTags ?? []) {
    const tag = ct.crm_tags as unknown as {
      id: string;
      name: string;
      color: string | null;
    } | null;
    if (tag) {
      const existing = tagsByClient.get(ct.client_id) ?? [];
      existing.push(tag);
      tagsByClient.set(ct.client_id, existing);
    }
  }

  // Count bookings and enrollments per client
  const bookingCounts = new Map<string, number>();
  const lastActivityMap = new Map<string, string>();
  for (const b of bookingsRes.data ?? []) {
    bookingCounts.set(b.client_id, (bookingCounts.get(b.client_id) ?? 0) + 1);
    const existing = lastActivityMap.get(b.client_id);
    if (!existing || b.starts_at > existing)
      lastActivityMap.set(b.client_id, b.starts_at);
  }
  const enrollmentCounts = new Map<string, number>();
  for (const id of enrollmentClientIds) {
    enrollmentCounts.set(id, (enrollmentCounts.get(id) ?? 0) + 1);
  }

  // Load payments + formations for score calculation (2 shared queries, no N×RPC)
  const profileIds = profiles.map((p) => p.id);
  const [paymentsRes, eventsRes] = await Promise.all([
    supabase
      .from("payments")
      .select("client_id, amount_cents")
      .eq("consultant_id", user.id)
      .eq("status", "succeeded")
      .in("client_id", profileIds),
    supabase
      .from("formation_registrations")
      .select("client_id")
      .eq("status", "confirmed")
      .in("client_id", profileIds),
  ]);

  const totalSpentMap = new Map<string, number>();
  for (const p of paymentsRes.data ?? []) {
    totalSpentMap.set(p.client_id, (totalSpentMap.get(p.client_id) ?? 0) + p.amount_cents);
  }
  const formationCountMap = new Map<string, number>();
  for (const e of eventsRes.data ?? []) {
    formationCountMap.set(e.client_id, (formationCountMap.get(e.client_id) ?? 0) + 1);
  }

  const now = Date.now();

  return profiles.map((p) => {
    const lastActivity = lastActivityMap.get(p.id);
    const inactiveDays = lastActivity
      ? Math.floor((now - new Date(lastActivity).getTime()) / 86400000)
      : 9999;
    const score = computeClientScore({
      completedBookings: bookingCounts.get(p.id) ?? 0,
      totalSpentCents: totalSpentMap.get(p.id) ?? 0,
      formationsEnrolled: enrollmentCounts.get(p.id) ?? 0,
      eventsAttended: formationCountMap.get(p.id) ?? 0,
      inactiveDays,
    });

    return {
      id: p.id,
      first_name: p.first_name,
      last_name: p.last_name,
      email: p.email,
      avatar_url: p.avatar_url,
      bookings_count: bookingCounts.get(p.id) ?? 0,
      enrollments_count: enrollmentCounts.get(p.id) ?? 0,
      tags: tagsByClient.get(p.id) ?? [],
      score,
    };
  });
};

// ─── Contact Detail ─────────────────────────────────────────

export type InteractionType = "booking" | "enrollment" | "formation" | "note";

export type Interaction = {
  id: string;
  type: InteractionType;
  title: string;
  subtitle?: string;
  date: string;
  status?: string;
};

export type CrmContactDetail = {
  profile: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string;
    phone: string | null;
    avatar_url: string | null;
    created_at: string;
  };
  score: number;
  interactions: Interaction[];
  notes: {
    id: string;
    content: string;
    created_at: string;
    updated_at: string;
  }[];
  tags: { id: string; name: string; color: string | null }[];
};

export const getContactDetail = async (
  clientId: string,
): Promise<CrmContactDetail | null> => {
  const user = await requireConsultant();
  const supabase = createAdminClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, email, phone, avatar_url, created_at")
    .eq("id", clientId)
    .single();

  if (!profile) return null;

  const consultantFormationIds =
    (
      await supabase
        .from("accompagnements")
        .select("id")
        .eq("consultant_id", user.id)
    ).data?.map((f) => f.id) ?? [];

  const [bookingsRes, enrollmentsRes, eventsRes, notesRes, tagsRes, scoreRes] =
    await Promise.all([
      supabase
        .from("bookings")
        .select("id, starts_at, status, consultation_types(title)")
        .eq("client_id", clientId)
        .eq("consultant_id", user.id)
        .order("starts_at", { ascending: false }),
      consultantFormationIds.length > 0
        ? supabase
            .from("accompagnement_enrollments")
            .select("accompagnement_id, enrolled_at, accompagnements(title)")
            .eq("client_id", clientId)
            .in("accompagnement_id", consultantFormationIds)
            .order("enrolled_at", { ascending: false })
        : Promise.resolve({ data: [] }),
      supabase
        .from("formation_registrations")
        .select("id, registered_at, status, formations(title)")
        .eq("client_id", clientId)
        .order("registered_at", { ascending: false }),
      supabase
        .from("crm_notes")
        .select("id, content, created_at, updated_at")
        .eq("client_id", clientId)
        .eq("consultant_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("crm_contact_tags")
        .select("crm_tags(id, name, color)")
        .eq("client_id", clientId)
        .eq("consultant_id", user.id),
      supabase.rpc("calculate_client_score", {
        p_client_id: clientId,
        p_consultant_id: user.id,
      }),
    ]);

  const tags = (tagsRes.data ?? [])
    .map(
      (ct) =>
        ct.crm_tags as unknown as {
          id: string;
          name: string;
          color: string | null;
        } | null,
    )
    .filter(Boolean) as { id: string; name: string; color: string | null }[];

  // Build unified interactions timeline
  const interactions: Interaction[] = [];

  for (const b of (bookingsRes.data ?? []) as unknown as {
    id: string;
    starts_at: string;
    status: string;
    consultation_types: { title: string } | null;
  }[]) {
    interactions.push({
      id: b.id,
      type: "booking",
      title: b.consultation_types?.title ?? "Consultation",
      date: b.starts_at,
      status: b.status,
    });
  }

  for (const e of (enrollmentsRes.data ?? []) as unknown as {
    accompagnement_id: string;
    enrolled_at: string;
    accompagnements: { title: string } | null;
  }[]) {
    interactions.push({
      id: e.accompagnement_id,
      type: "enrollment",
      title: e.accompagnements?.title ?? "Accompagnement",
      date: e.enrolled_at,
    });
  }

  for (const ev of (eventsRes.data ?? []) as unknown as {
    id: string;
    registered_at: string;
    status: string;
    formations: { title: string } | null;
  }[]) {
    interactions.push({
      id: ev.id,
      type: "formation",
      title: ev.formations?.title ?? "Formation",
      date: ev.registered_at,
      status: ev.status,
    });
  }

  interactions.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  return {
    profile,
    score: (scoreRes.data as number | null) ?? 0,
    interactions,
    notes: notesRes.data ?? [],
    tags,
  };
};

// ─── Dossier famille (enfants) ──────────────────────────────

/**
 * Une consultante n'accède au dossier de santé d'un client que si une vraie
 * relation existe : un rendez-vous non annulé, ou une inscription à l'un de ses
 * accompagnements. Même périmètre que `getContactDetail`, et un rendez-vous
 * annulé ne donne aucun droit d'accès.
 */
const hasClientRelationship = async (
  supabase: ReturnType<typeof createAdminClient>,
  consultantId: string,
  clientId: string,
): Promise<boolean> => {
  const { data: bookingLink } = await supabase
    .from("bookings")
    .select("id")
    .eq("client_id", clientId)
    .eq("consultant_id", consultantId)
    .not("status", "eq", "cancelled")
    .limit(1);
  if (bookingLink && bookingLink.length > 0) return true;

  const { data: accompagnements } = await supabase
    .from("accompagnements")
    .select("id")
    .eq("consultant_id", consultantId);

  const accompagnementIds = (accompagnements ?? []).map((a) => a.id);
  if (accompagnementIds.length === 0) return false;

  const { data: enrollmentLink } = await supabase
    .from("accompagnement_enrollments")
    .select("client_id")
    .eq("client_id", clientId)
    .in("accompagnement_id", accompagnementIds)
    .limit(1);

  return !!enrollmentLink && enrollmentLink.length > 0;
};

/**
 * Charge en une seule action le dossier famille d'un client : ses enfants et
 * leurs pesées regroupées par enfant.
 *
 * La relation consultante/client est vérifiée ici, une seule fois, et n'est
 * jamais fournie par l'appelant : une server action est un endpoint HTTP dont
 * les arguments sont entièrement contrôlés par le client, donc aucun paramètre
 * ne doit pouvoir court-circuiter ce contrôle d'accès. La liste des enfants est
 * re-dérivée depuis la base : aucun identifiant d'enfant fourni par l'appelant
 * n'est utilisé tel quel.
 */
export const getFamilyDossierForContact = async (
  clientId: string,
): Promise<{
  children: Child[];
  measurementsByChild: Record<string, WeightMeasurement[]>;
}> => {
  const user = await requireConsultant();
  const supabase = createAdminClient();

  if (!(await hasClientRelationship(supabase, user.id, clientId))) {
    return { children: [], measurementsByChild: {} };
  }

  const { data: childrenData } = await supabase
    .from("children")
    .select("*")
    .eq("client_id", clientId)
    .order("birth_date", { ascending: false });
  const children = childrenData ?? [];

  const childIds = children.map((c: Child) => c.id);
  const measurementsByChild: Record<string, WeightMeasurement[]> = {};
  for (const childId of childIds) {
    measurementsByChild[childId] = [];
  }

  if (childIds.length > 0) {
    const { data: measurements } = await supabase
      .from("weight_measurements")
      .select("*")
      .in("child_id", childIds)
      .order("measured_at", { ascending: true });
    for (const measurement of (measurements ?? []) as WeightMeasurement[]) {
      measurementsByChild[measurement.child_id]?.push(measurement);
    }
  }

  return { children, measurementsByChild };
};

// ─── Fiche de consultation ──────────────────────────────────

/**
 * Vérifie que le booking appartient bien à la consultante courante et
 * retourne sa fiche (client_id, consultant_id) — jamais un paramètre
 * "déjà vérifié" fourni par l'appelant, comme pour hasClientRelationship.
 */
const getOwnedBooking = async (
  supabase: ReturnType<typeof createAdminClient>,
  consultantId: string,
  bookingId: string,
): Promise<{ id: string; client_id: string; consultant_id: string } | null> => {
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, client_id, consultant_id")
    .eq("id", bookingId)
    .single();

  if (!booking || booking.consultant_id !== consultantId) return null;
  return booking;
};

export const getConsultationNoteForBooking = async (
  bookingId: string,
): Promise<ConsultationNote | null> => {
  const user = await requireConsultant();
  const supabase = createAdminClient();

  const booking = await getOwnedBooking(supabase, user.id, bookingId);
  if (!booking) return null;

  const { data } = await supabase
    .from("consultation_notes")
    .select("*")
    .eq("booking_id", bookingId)
    .single();

  return (data as ConsultationNote | null) ?? null;
};

export const upsertConsultationNote = async (
  bookingId: string,
  fields: unknown,
): Promise<ActionResult<{ id: string }>> => {
  const user = await requireConsultant();
  const supabase = createAdminClient();

  const booking = await getOwnedBooking(supabase, user.id, bookingId);
  if (!booking) {
    return { success: false, error: "Aucune relation avec ce rendez-vous" };
  }

  const parsed = consultationNoteFieldsSchema.safeParse(fields);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const { data: note, error } = await supabase
    .from("consultation_notes")
    .upsert(
      {
        booking_id: bookingId,
        client_id: booking.client_id,
        consultant_id: user.id,
        ...(parsed.data as ConsultationNoteFieldsInput),
      },
      { onConflict: "booking_id" },
    )
    .select("id")
    .single();

  if (error || !note) {
    return { success: false, error: "Erreur lors de l'enregistrement" };
  }

  revalidatePath(`/espace-consultante/reservations/${bookingId}`);
  return { success: true, data: note };
};

export const publishConsultationNote = async (
  bookingId: string,
): Promise<ActionResult> => {
  const user = await requireConsultant();
  const supabase = createAdminClient();

  const booking = await getOwnedBooking(supabase, user.id, bookingId);
  if (!booking) {
    return { success: false, error: "Aucune relation avec ce rendez-vous" };
  }

  const { data: note } = await supabase
    .from("consultation_notes")
    .select("motif, observation, conclusion")
    .eq("booking_id", bookingId)
    .single();

  if (!note || !note.motif.trim() || !note.observation.trim() || !note.conclusion.trim()) {
    return {
      success: false,
      error: "Le motif, l'observation et la conclusion doivent être renseignés avant publication",
    };
  }

  const { error } = await supabase
    .from("consultation_notes")
    .update({ status: "published", published_at: new Date().toISOString() })
    .eq("booking_id", bookingId);

  if (error) {
    return { success: false, error: "Erreur lors de la publication" };
  }

  revalidatePath(`/espace-consultante/reservations/${bookingId}`);
  return { success: true };
};

export const unpublishConsultationNote = async (
  bookingId: string,
): Promise<ActionResult> => {
  const user = await requireConsultant();
  const supabase = createAdminClient();

  const booking = await getOwnedBooking(supabase, user.id, bookingId);
  if (!booking) {
    return { success: false, error: "Aucune relation avec ce rendez-vous" };
  }

  const { error } = await supabase
    .from("consultation_notes")
    .update({ status: "draft" })
    .eq("booking_id", bookingId);

  if (error) {
    return { success: false, error: "Erreur lors de la mise à jour" };
  }

  revalidatePath(`/espace-consultante/reservations/${bookingId}`);
  return { success: true };
};

/**
 * Panneau "consultations précédentes" du dossier famille : une seule
 * vérification de relation consultante/client, comme getFamilyDossierForContact.
 */
export const getConsultationNotesForFamilyDossier = async (
  clientId: string,
): Promise<ConsultationNote[]> => {
  const user = await requireConsultant();
  const supabase = createAdminClient();

  if (!(await hasClientRelationship(supabase, user.id, clientId))) {
    return [];
  }

  const { data } = await supabase
    .from("consultation_notes")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });

  return (data as ConsultationNote[] | null) ?? [];
};

export const deleteChildAsConsultant = async (
  childId: string,
): Promise<ActionResult> => {
  const user = await requireConsultant();
  const supabase = createAdminClient();

  const { data: child } = await supabase
    .from("children")
    .select("id, client_id")
    .eq("id", childId)
    .single();
  if (!child) {
    return { success: false, error: "Enfant introuvable" };
  }

  if (!(await hasClientRelationship(supabase, user.id, child.client_id))) {
    return { success: false, error: "Aucune relation avec ce client" };
  }

  const { error } = await supabase.from("children").delete().eq("id", childId);
  if (error) {
    return { success: false, error: "Erreur lors de la suppression" };
  }

  revalidatePath(`/espace-consultante/crm/${child.client_id}`);
  return { success: true };
};

export const deleteWeightMeasurementAsConsultant = async (
  measurementId: string,
): Promise<ActionResult> => {
  const user = await requireConsultant();
  const supabase = createAdminClient();

  const { data: measurement } = await supabase
    .from("weight_measurements")
    .select("id, child_id")
    .eq("id", measurementId)
    .single();
  if (!measurement) {
    return { success: false, error: "Pesée introuvable" };
  }

  const { data: child } = await supabase
    .from("children")
    .select("id, client_id")
    .eq("id", measurement.child_id)
    .single();
  if (!child) {
    return { success: false, error: "Pesée introuvable" };
  }

  if (!(await hasClientRelationship(supabase, user.id, child.client_id))) {
    return { success: false, error: "Aucune relation avec ce client" };
  }

  // La consultante gère le dossier : elle n'est pas soumise à la fenêtre de 24h
  // ni au `recorded_by` qui encadrent les suppressions côté client.
  const { error } = await supabase
    .from("weight_measurements")
    .delete()
    .eq("id", measurementId);
  if (error) {
    return { success: false, error: "Erreur lors de la suppression" };
  }

  revalidatePath(`/espace-consultante/crm/${child.client_id}`);
  return { success: true };
};

export const addWeightMeasurementAsConsultant = async (
  input: unknown,
): Promise<ActionResult<{ id: string }>> => {
  const user = await requireConsultant();
  const parsed = weightMeasurementSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const supabase = createAdminClient();
  const { data: child } = await supabase
    .from("children")
    .select("id, client_id, birth_date")
    .eq("id", parsed.data.child_id)
    .single();
  if (!child) {
    return { success: false, error: "Enfant introuvable" };
  }

  if (!(await hasClientRelationship(supabase, user.id, child.client_id))) {
    return { success: false, error: "Aucune relation avec ce client" };
  }

  // Une pesée antérieure à la naissance est forcément une erreur de saisie.
  if (child.birth_date && parsed.data.measured_at < child.birth_date) {
    return {
      success: false,
      error: "La date de la pesée ne peut pas précéder la date de naissance.",
    };
  }

  const { data: measurement, error } = await supabase
    .from("weight_measurements")
    .insert({
      child_id: parsed.data.child_id,
      weight_grams: parsed.data.weight_grams,
      measured_at: parsed.data.measured_at,
      source: "consultation",
      recorded_by: user.id,
      consultant_id: user.id,
    })
    .select("id")
    .single();

  if (error || !measurement) {
    return { success: false, error: "Erreur lors de l'ajout de la pesée" };
  }

  revalidatePath(`/espace-consultante/crm/${child.client_id}`);
  return { success: true, data: measurement };
};

// ─── Notes CRUD ─────────────────────────────────────────────

export const createNote = async (
  data: unknown,
): Promise<ActionResult<{ id: string }>> => {
  const user = await requireConsultant();
  const parsed = crmNoteSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const supabase = createAdminClient();
  const { data: note, error } = await supabase
    .from("crm_notes")
    .insert({
      client_id: parsed.data.client_id,
      consultant_id: user.id,
      content: parsed.data.content,
    })
    .select("id")
    .single();

  if (error) {
    return { success: false, error: "Erreur lors de la création de la note" };
  }

  revalidatePath(`/espace-consultante/crm/${parsed.data.client_id}`);
  return { success: true, data: note };
};

export const updateNote = async (
  noteId: string,
  content: string,
): Promise<ActionResult> => {
  const user = await requireConsultant();
  if (!content.trim()) {
    return { success: false, error: "Le contenu est requis" };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("crm_notes")
    .update({ content, updated_at: new Date().toISOString() })
    .eq("id", noteId)
    .eq("consultant_id", user.id);

  if (error) {
    return { success: false, error: "Erreur lors de la mise à jour" };
  }

  revalidatePath("/espace-consultante/crm");
  return { success: true };
};

export const deleteNote = async (noteId: string): Promise<ActionResult> => {
  const user = await requireConsultant();
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("crm_notes")
    .delete()
    .eq("id", noteId)
    .eq("consultant_id", user.id);

  if (error) {
    return { success: false, error: "Erreur lors de la suppression" };
  }

  revalidatePath("/espace-consultante/crm");
  return { success: true };
};

// ─── Tags CRUD ──────────────────────────────────────────────

export const getTags = async (): Promise<
  { id: string; name: string; color: string | null }[]
> => {
  const user = await requireConsultant();
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("crm_tags")
    .select("id, name, color")
    .or(`consultant_id.eq.${user.id},consultant_id.is.null`)
    .order("name", { ascending: true });

  return data ?? [];
};

export const createTag = async (
  data: unknown,
  scope: "personal" | "global" = "personal",
): Promise<ActionResult<{ id: string }>> => {
  const user = await requireConsultant();
  const parsed = crmTagSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  // Un libelle global sert au ciblage de toute la base : le creer engage plus
  // qu'un libelle personnel, il reste donc reserve a l'administration.
  if (scope === "global" && !user.roles.includes("admin")) {
    return {
      success: false,
      error: "Seule l'administration peut créer un libellé global",
    };
  }

  const supabase = createAdminClient();
  const { data: tag, error } = await supabase
    .from("crm_tags")
    .insert({
      name: parsed.data.name,
      color: parsed.data.color ?? null,
      consultant_id: scope === "global" ? null : user.id,
    })
    .select("id")
    .single();

  if (error) {
    return { success: false, error: "Erreur lors de la création du tag" };
  }

  revalidatePath("/espace-consultante/crm");
  return { success: true, data: tag };
};

export const updateTag = async (
  tagId: string,
  data: unknown,
): Promise<ActionResult> => {
  const user = await requireConsultant();
  const parsed = crmTagSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("crm_tags")
    .update({ name: parsed.data.name, color: parsed.data.color ?? null })
    .eq("id", tagId)
    .eq("consultant_id", user.id);

  if (error) {
    return { success: false, error: "Erreur lors de la mise à jour" };
  }

  revalidatePath("/espace-consultante/crm");
  return { success: true };
};

export const deleteTag = async (tagId: string): Promise<ActionResult> => {
  const user = await requireConsultant();
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("crm_tags")
    .delete()
    .eq("id", tagId)
    .eq("consultant_id", user.id);

  if (error) {
    return { success: false, error: "Erreur lors de la suppression" };
  }

  revalidatePath("/espace-consultante/crm");
  return { success: true };
};

// ─── Tag Assignment ─────────────────────────────────────────

export const assignTag = async (
  clientId: string,
  tagId: string,
): Promise<ActionResult> => {
  const user = await requireConsultant();
  const supabase = createAdminClient();

  const { error } = await supabase.from("crm_contact_tags").upsert(
    {
      client_id: clientId,
      tag_id: tagId,
      consultant_id: user.id,
    },
    { onConflict: "client_id,tag_id,consultant_id" },
  );

  if (error) {
    return { success: false, error: "Erreur lors de l'assignation du tag" };
  }

  revalidatePath(`/espace-consultante/crm/${clientId}`);
  revalidatePath("/espace-consultante/crm");
  return { success: true };
};

export const removeTag = async (
  clientId: string,
  tagId: string,
): Promise<ActionResult> => {
  const user = await requireConsultant();
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("crm_contact_tags")
    .delete()
    .eq("client_id", clientId)
    .eq("tag_id", tagId)
    .eq("consultant_id", user.id);

  if (error) {
    return { success: false, error: "Erreur lors du retrait du tag" };
  }

  revalidatePath(`/espace-consultante/crm/${clientId}`);
  revalidatePath("/espace-consultante/crm");
  return { success: true };
};
