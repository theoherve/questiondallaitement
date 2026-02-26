"use server";

import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { crmNoteSchema, crmTagSchema } from "@/validations/crm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionResult } from "@/types";

const requireConsultant = async () => {
  const user = await getSessionUser();
  if (!user || (user.role !== "consultant" && user.role !== "admin"))
    redirect("/connexion");
  return user;
};

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
      .select("client_id")
      .eq("consultant_id", user.id)
      .not("status", "eq", "cancelled"),
    supabase
      .from("formation_enrollments")
      .select("client_id, formation_id")
      .in(
        "formation_id",
        (
          await supabase
            .from("formations")
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
  for (const id of bookingClientIds) {
    bookingCounts.set(id, (bookingCounts.get(id) ?? 0) + 1);
  }
  const enrollmentCounts = new Map<string, number>();
  for (const id of enrollmentClientIds) {
    enrollmentCounts.set(id, (enrollmentCounts.get(id) ?? 0) + 1);
  }

  return profiles.map((p) => ({
    id: p.id,
    first_name: p.first_name,
    last_name: p.last_name,
    email: p.email,
    avatar_url: p.avatar_url,
    bookings_count: bookingCounts.get(p.id) ?? 0,
    enrollments_count: enrollmentCounts.get(p.id) ?? 0,
    tags: tagsByClient.get(p.id) ?? [],
  }));
};

// ─── Contact Detail ─────────────────────────────────────────

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
  bookings: {
    id: string;
    starts_at: string;
    status: string;
    consultation_types: { title: string } | null;
  }[];
  enrollments: {
    formation_id: string;
    enrolled_at: string;
    formations: { title: string } | null;
  }[];
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
        .from("formations")
        .select("id")
        .eq("consultant_id", user.id)
    ).data?.map((f) => f.id) ?? [];

  const [bookingsRes, enrollmentsRes, notesRes, tagsRes] = await Promise.all([
    supabase
      .from("bookings")
      .select("id, starts_at, status, consultation_types(title)")
      .eq("client_id", clientId)
      .eq("consultant_id", user.id)
      .order("starts_at", { ascending: false }),
    consultantFormationIds.length > 0
      ? supabase
          .from("formation_enrollments")
          .select("formation_id, enrolled_at, formations(title)")
          .eq("client_id", clientId)
          .in("formation_id", consultantFormationIds)
          .order("enrolled_at", { ascending: false })
      : Promise.resolve({ data: [] }),
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

  return {
    profile,
    bookings: (bookingsRes.data ??
      []) as unknown as CrmContactDetail["bookings"],
    enrollments: (enrollmentsRes.data ??
      []) as unknown as CrmContactDetail["enrollments"],
    notes: notesRes.data ?? [],
    tags,
  };
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
): Promise<ActionResult<{ id: string }>> => {
  const user = await requireConsultant();
  const parsed = crmTagSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const supabase = createAdminClient();
  const { data: tag, error } = await supabase
    .from("crm_tags")
    .insert({
      name: parsed.data.name,
      color: parsed.data.color ?? null,
      consultant_id: user.id,
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
