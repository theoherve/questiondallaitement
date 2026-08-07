import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BookOpen,
  CalendarDays,
  CreditCard,
  Calendar,
  Info,
  Tag,
  Activity,
  Stethoscope,
} from "lucide-react";
import { UserProfileHeader } from "./_components/user-profile-header";
import { TabInfos } from "./_components/tab-infos";
import { TabReservations } from "./_components/tab-reservations";
import { TabAccompagnements } from "./_components/tab-accompagnements";
import { TabPaiements } from "./_components/tab-paiements";
import { TabFormations } from "./_components/tab-formations";
import { TabCrm } from "./_components/tab-crm";
import { TabActivite, type TimelineEntry } from "./_components/tab-activite";
import { TabConsultant } from "./_components/tab-consultant";
import type { UserRole } from "@/types/database";

type Props = {
  params: Promise<{ id: string }>;
};

export const generateMetadata = async ({
  params,
}: Props): Promise<Metadata> => {
  const { id } = await params;
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("profiles")
    .select("first_name, last_name")
    .eq("id", id)
    .single();

  const name = data
    ? `${data.first_name ?? ""} ${data.last_name ?? ""}`.trim() || "Utilisateur"
    : "Utilisateur";

  return { title: `${name} — Détail utilisateur` };
};

const UserDetailPage = async ({ params }: Props) => {
  const currentUser = await getSessionUser();
  if (!currentUser || !currentUser.roles.includes("admin")) redirect("/admin");

  const { id } = await params;
  const supabase = createAdminClient();

  // ─── Fetch profile ───────────────────────────────────────
  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, email, first_name, last_name, phone, avatar_url, roles, email_verified, gdpr_consent_at, deleted_at, created_at, updated_at",
    )
    .eq("id", id)
    .single();

  if (!profile) notFound();

  const roles = profile.roles as UserRole[];
  const isConsultant =
    roles.includes("consultant") || roles.includes("consultant_limited");

  // ─── Parallel data fetches ───────────────────────────────
  const [
    bookingsRes,
    enrollmentsRes,
    paymentsRes,
    eventsRes,
    tagsRes,
    notesRes,
    auditRes,
    scoreRes,
    availableTagsRes,
  ] = await Promise.all([
    supabase
      .from("bookings")
      .select(
        "id, starts_at, ends_at, status, location, consultation_types(title), profiles!bookings_consultant_id_fkey(first_name, last_name)",
      )
      .eq("client_id", id)
      .order("starts_at", { ascending: false }),
    supabase
      .from("accompagnement_enrollments")
      .select("id, enrolled_at, accompagnement_id, accompagnements(title, status)")
      .eq("client_id", id)
      .order("enrolled_at", { ascending: false }),
    supabase
      .from("payments")
      .select(
        "id, amount_cents, currency, type, status, stripe_invoice_url, created_at, profiles!payments_consultant_id_fkey(first_name, last_name)",
      )
      .eq("client_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("formation_registrations")
      .select("id, registered_at, status, formations(title, starts_at, type)")
      .eq("client_id", id)
      .order("registered_at", { ascending: false }),
    supabase
      .from("crm_contact_tags")
      .select("client_id, consultant_id, crm_tags(id, name, color)")
      .eq("client_id", id),
    supabase
      .from("crm_notes")
      .select(
        "id, content, created_at, profiles!crm_notes_consultant_id_fkey(first_name, last_name)",
      )
      .eq("client_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("audit_logs")
      .select("id, action, entity_type, metadata, created_at")
      .or(`user_id.eq."${id}",entity_id.eq."${id}"`)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase.rpc("calculate_client_score", {
      p_client_id: id,
      p_consultant_id: null,
    }),
    supabase
      .from("crm_tags")
      .select("id, name, color")
      .order("name", { ascending: true }),
  ]);

  // ─── Process enrollments with progress ───────────────────
  const enrollments = enrollmentsRes.data ?? [];
  let enrollmentsWithProgress: {
    id: string;
    enrolled_at: string;
    accompagnements: { title: string; status: string } | null;
    progress_pct: number;
  }[] = [];

  if (enrollments.length > 0) {
    const enrollmentIds = enrollments.map((e) => e.id);
    const { data: progressData } = await supabase
      .from("accompagnement_progress")
      .select("enrollment_id, completed")
      .in("enrollment_id", enrollmentIds);

    const progressMap = new Map<
      string,
      { total: number; completed: number }
    >();
    for (const p of progressData ?? []) {
      const entry = progressMap.get(p.enrollment_id) ?? {
        total: 0,
        completed: 0,
      };
      entry.total++;
      if (p.completed) entry.completed++;
      progressMap.set(p.enrollment_id, entry);
    }

    enrollmentsWithProgress = enrollments.map((e) => {
      const progress = progressMap.get(e.id);
      const pct =
        progress && progress.total > 0
          ? Math.round((progress.completed / progress.total) * 100)
          : 0;
      return {
        id: e.id,
        enrolled_at: e.enrolled_at,
        accompagnements: e.accompagnements as unknown as { title: string; status: string } | null,
        progress_pct: pct,
      };
    });
  }

  // ─── Process bookings ────────────────────────────────────
  const bookings = (bookingsRes.data ?? []).map((b) => ({
    id: b.id,
    starts_at: b.starts_at,
    ends_at: b.ends_at,
    status: b.status,
    location: b.location,
    consultation_types: b.consultation_types as unknown as { title: string } | null,
    consultant: b.profiles as unknown as {
      first_name: string | null;
      last_name: string | null;
    } | null,
  }));

  // ─── Process payments ────────────────────────────────────
  const payments = (paymentsRes.data ?? []).map((p) => ({
    id: p.id,
    amount_cents: p.amount_cents,
    currency: p.currency,
    type: p.type,
    status: p.status,
    stripe_invoice_url: p.stripe_invoice_url,
    created_at: p.created_at,
    consultant: p.profiles as unknown as {
      first_name: string | null;
      last_name: string | null;
    } | null,
  }));

  // ─── Process formations ──────────────────────────────────────
  const registrations = (eventsRes.data ?? []).map((r) => ({
    id: r.id,
    registered_at: r.registered_at,
    status: r.status,
    formations: r.formations as unknown as {
      title: string;
      starts_at: string;
      type: string;
    } | null,
  }));

  // ─── Process CRM tags ───────────────────────────────────
  const tags = (tagsRes.data ?? [])
    .map((ct) => {
      const tag = ct.crm_tags as unknown as {
        id: string;
        name: string;
        color: string | null;
      } | null;
      if (!tag) return null;
      return {
        id: tag.id,
        name: tag.name,
        color: tag.color,
        consultant_id: ct.consultant_id as string,
      };
    })
    .filter(Boolean) as {
    id: string;
    name: string;
    color: string | null;
    consultant_id: string;
  }[];

  // ─── Process notes ───────────────────────────────────────
  const notes = (notesRes.data ?? []).map((n) => ({
    id: n.id,
    content: n.content,
    created_at: n.created_at,
    consultant: n.profiles as unknown as {
      first_name: string | null;
      last_name: string | null;
    } | null,
  }));

  // ─── Build unified timeline ──────────────────────────────
  const timeline: TimelineEntry[] = [];

  for (const b of bookings) {
    timeline.push({
      id: b.id,
      type: "booking",
      title: b.consultation_types?.title ?? "Consultation",
      subtitle: b.consultant
        ? `${b.consultant.first_name ?? ""} ${b.consultant.last_name ?? ""}`.trim()
        : undefined,
      date: b.starts_at,
      status: b.status,
    });
  }

  for (const e of enrollmentsWithProgress) {
    timeline.push({
      id: e.id,
      type: "enrollment",
      title: e.accompagnements?.title ?? "Accompagnement",
      subtitle: `Progression: ${e.progress_pct}%`,
      date: e.enrolled_at,
    });
  }

  for (const p of payments) {
    const amount = new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: p.currency,
    }).format(p.amount_cents / 100);
    timeline.push({
      id: p.id,
      type: "payment",
      title: `Paiement de ${amount}`,
      subtitle: p.type,
      date: p.created_at,
      status: p.status,
    });
  }

  for (const r of registrations) {
    timeline.push({
      id: r.id,
      type: "formation",
      title: r.formations?.title ?? "Formation",
      date: r.registered_at,
      status: r.status,
    });
  }

  for (const a of auditRes.data ?? []) {
    timeline.push({
      id: a.id,
      type: "audit",
      title: a.action,
      subtitle: a.entity_type,
      date: a.created_at,
    });
  }

  timeline.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  // ─── Consultant data (conditional) ───────────────────────
  let consultantData = null;
  let consultationTypes: {
    id: string;
    title: string;
    duration_minutes: number;
    price_cents: number;
    is_active: boolean;
  }[] = [];
  let consultantStats = {
    totalBookings: 0,
    totalRevenue: 0,
    activeConsultationTypes: 0,
  };

  if (isConsultant) {
    const [consultantRes, ctRes, cBookingsRes, cPaymentsRes] =
      await Promise.all([
        supabase
          .from("consultants")
          .select(
            "id, slug, bio, specialties, commission_rate, is_active, stripe_account_id, stripe_account_status, zoom_access_token, onboarding_completed, created_at",
          )
          .eq("id", id)
          .single(),
        supabase
          .from("consultation_types")
          .select("id, title, duration_minutes, price_cents, is_active")
          .eq("consultant_id", id)
          .order("title"),
        supabase
          .from("bookings")
          .select("id")
          .eq("consultant_id", id)
          .not("status", "eq", "cancelled"),
        supabase
          .from("payments")
          .select("amount_cents")
          .eq("consultant_id", id)
          .eq("status", "succeeded"),
      ]);

    consultantData = consultantRes.data
      ? {
          ...consultantRes.data,
          specialties: (consultantRes.data.specialties ?? []) as string[],
        }
      : null;
    consultationTypes = (ctRes.data ?? []) as typeof consultationTypes;
    consultantStats = {
      totalBookings: cBookingsRes.data?.length ?? 0,
      totalRevenue: (cPaymentsRes.data ?? []).reduce(
        (sum, p) => sum + (p.amount_cents ?? 0),
        0,
      ),
      activeConsultationTypes: consultationTypes.filter((ct) => ct.is_active)
        .length,
    };
  }

  const score = (scoreRes.data as number | null) ?? 0;
  const availableTags = (availableTagsRes.data ?? []) as {
    id: string;
    name: string;
    color: string | null;
  }[];

  return (
    <div className="space-y-6">
      <UserProfileHeader
        user={{
          id: profile.id,
          email: profile.email,
          first_name: profile.first_name,
          last_name: profile.last_name,
          avatar_url: profile.avatar_url,
          roles: roles,
          created_at: profile.created_at,
          email_verified: profile.email_verified ?? false,
          deleted_at: profile.deleted_at,
          gdpr_consent_at: profile.gdpr_consent_at,
        }}
        score={score}
        isCurrentAdmin={profile.id === currentUser.id}
      />

      <Tabs defaultValue="infos">
        <TabsList variant="line" className="w-full flex-wrap">
          <TabsTrigger value="infos">
            <Info className="mr-1.5 h-4 w-4" />
            Infos
          </TabsTrigger>
          <TabsTrigger value="reservations">
            <CalendarDays className="mr-1.5 h-4 w-4" />
            Réservations
            {bookings.length > 0 && (
              <span className="ml-1 text-xs text-muted-foreground">
                ({bookings.length})
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="accompagnements">
            <BookOpen className="mr-1.5 h-4 w-4" />
            Accompagnements
            {enrollmentsWithProgress.length > 0 && (
              <span className="ml-1 text-xs text-muted-foreground">
                ({enrollmentsWithProgress.length})
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="paiements">
            <CreditCard className="mr-1.5 h-4 w-4" />
            Paiements
          </TabsTrigger>
          <TabsTrigger value="accompagnements">
            <Calendar className="mr-1.5 h-4 w-4" />
            Événements
          </TabsTrigger>
          <TabsTrigger value="crm">
            <Tag className="mr-1.5 h-4 w-4" />
            CRM
          </TabsTrigger>
          <TabsTrigger value="activite">
            <Activity className="mr-1.5 h-4 w-4" />
            Activité
          </TabsTrigger>
          {isConsultant && (
            <TabsTrigger value="consultant">
              <Stethoscope className="mr-1.5 h-4 w-4" />
              Consultante
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="infos">
          <TabInfos
            user={{
              id: profile.id,
              email: profile.email,
              first_name: profile.first_name,
              last_name: profile.last_name,
              phone: profile.phone,
              roles: roles,
              created_at: profile.created_at,
              updated_at: profile.updated_at,
            }}
          />
        </TabsContent>

        <TabsContent value="reservations">
          <TabReservations bookings={bookings} />
        </TabsContent>

        <TabsContent value="accompagnements">
          <TabAccompagnements enrollments={enrollmentsWithProgress} userId={id} />
        </TabsContent>

        <TabsContent value="paiements">
          <TabPaiements payments={payments} />
        </TabsContent>

        <TabsContent value="accompagnements">
          <TabFormations registrations={registrations} />
        </TabsContent>

        <TabsContent value="crm">
          <TabCrm
            userId={id}
            tags={tags}
            notes={notes}
            availableTags={availableTags}
          />
        </TabsContent>

        <TabsContent value="activite">
          <TabActivite entries={timeline} />
        </TabsContent>

        {isConsultant && consultantData && (
          <TabsContent value="consultant">
            <TabConsultant
              consultant={consultantData}
              consultationTypes={consultationTypes}
              stats={consultantStats}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default UserDetailPage;
