import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Edit,
  TrendingUp,
  Video,
} from "lucide-react";
import { ConsultantActiveToggle } from "../_components/consultant-active-toggle";
import { AdminConsultationTypes } from "../_components/admin-consultation-types";
import { AdminLocations } from "../_components/admin-locations";
import { AdminAvailabilities } from "../_components/admin-availabilities";
import { AdminAvatarUpload } from "../_components/admin-avatar-upload";
import { adminGetConsultationTypes, adminGetConsultationTypeTemplates, adminGetLocations, adminGetAvailabilities } from "./actions";
import { getLocationConfigs } from "@/app/(dashboard)/admin/reservation/actions";

type Props = {
  params: Promise<{ id: string }>;
};

export const generateMetadata = async ({
  params,
}: Props): Promise<Metadata> => {
  const { id } = await params;
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("consultants")
    .select("profiles!consultants_id_fkey (first_name, last_name)")
    .eq("id", id)
    .single();

  const profile = data?.profiles as unknown as {
    first_name: string | null;
    last_name: string | null;
  } | null;
  const name = profile
    ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim()
    : "Consultante";

  return { title: `${name} — Consultante` };
};

const formatPrice = (cents: number): string =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);

const ConsultantDetailPage = async ({ params }: Props) => {
  const user = await getSessionUser();
  if (!user || !user.roles.includes("admin")) redirect("/admin");

  const { id } = await params;
  const supabase = createAdminClient();

  const { data: consultant } = await supabase
    .from("consultants")
    .select(
      `
      id,
      slug,
      bio,
      specialties,
      commission_rate,
      is_active,
      stripe_account_id,
      stripe_account_status,
      zoom_access_token,
      onboarding_completed,
      created_at,
      profiles!consultants_id_fkey (
        first_name,
        last_name,
        email,
        avatar_url,
        phone
      )
    `
    )
    .eq("id", id)
    .single();

  if (!consultant) notFound();

  const profile = consultant.profiles as unknown as {
    first_name: string | null;
    last_name: string | null;
    email: string;
    avatar_url: string | null;
    phone: string | null;
  };

  const fullName =
    `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() ||
    "Sans nom";

  const [formationsRes, bookingsRes, paymentsRes, consultationTypes, consultationTypeTemplates, consultantLocations, availabilities, locationConfigs] = await Promise.all([
    supabase
      .from("formations")
      .select("id, title, slug, status, price_cents, currency")
      .eq("consultant_id", id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("bookings")
      .select("id, starts_at, status")
      .eq("consultant_id", id)
      .order("starts_at", { ascending: false })
      .limit(10),
    supabase
      .from("payments")
      .select("amount_cents")
      .eq("consultant_id", id)
      .eq("status", "succeeded"),
    adminGetConsultationTypes(id),
    adminGetConsultationTypeTemplates(id),
    adminGetLocations(id),
    adminGetAvailabilities(id),
    getLocationConfigs(),
  ]);

  const formations = formationsRes.data ?? [];
  const bookings = bookingsRes.data ?? [];
  const payments = paymentsRes.data ?? [];
  const totalRevenue = payments.reduce(
    (sum, p) => sum + (p.amount_cents ?? 0),
    0
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/consultantes">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Link>
        </Button>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          <AdminAvatarUpload
            consultantId={consultant.id}
            avatarUrl={profile.avatar_url}
            firstName={profile.first_name}
            lastName={profile.last_name}
          />
          <div>
            <h1 className="font-serif text-2xl font-bold text-primary-green">
              {fullName}
            </h1>
            <p className="text-sm text-muted-foreground">{profile.email}</p>
            {profile.phone && (
              <p className="text-sm text-muted-foreground">{profile.phone}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ConsultantActiveToggle
            id={consultant.id}
            isActive={consultant.is_active ?? false}
          />
          <span className="text-sm text-muted-foreground">
            {consultant.is_active ? "Active" : "Inactive"}
          </span>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/admin/consultantes/${id}/edit`}>
              <Edit className="mr-2 h-4 w-4" />
              Modifier
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<BookOpen className="h-5 w-5 text-primary-green" />}
          label="Formations"
          value={formations.length.toString()}
        />
        <StatCard
          icon={<CalendarDays className="h-5 w-5 text-primary-green" />}
          label="Réservations"
          value={bookings.length.toString()}
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5 text-primary-green" />}
          label="Revenus totaux"
          value={formatPrice(totalRevenue)}
        />
        <StatCard
          icon={<CreditCard className="h-5 w-5 text-primary-green" />}
          label="Commission"
          value={`${consultant.commission_rate}%`}
        />
      </div>

      {/* Infos consultante */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="gap-4">
          <CardHeader className="gap-0">
            <CardTitle className="text-primary-green">Profil</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Slug</p>
              <p className="text-sm">/consultantes/{consultant.slug}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Bio</p>
              <p className="text-sm">{consultant.bio || "Non renseignée"}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Spécialités
              </p>
              <div className="mt-1 flex flex-wrap gap-1">
                {(consultant.specialties as string[] ?? []).length > 0 ? (
                  (consultant.specialties as string[]).map((spec) => (
                    <Badge key={spec} variant="secondary">
                      {spec}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Aucune spécialité
                  </p>
                )}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Membre depuis
              </p>
              <p className="text-sm">
                {new Date(consultant.created_at).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="gap-4">
          <CardHeader className="gap-0">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-primary-green">
              Intégrations & onboarding
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Integration tiles */}
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-3">
                <div className="flex items-center gap-1.5">
                  <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">Stripe</span>
                </div>
                <StripeStatusBadge status={consultant.stripe_account_status} />
                {consultant.stripe_account_id && (
                  <p className="truncate font-mono text-[10px] text-muted-foreground">
                    {consultant.stripe_account_id}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-3">
                <div className="flex items-center gap-1.5">
                  <Video className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">Zoom</span>
                </div>
                <Badge
                  variant={consultant.zoom_access_token ? "default" : "secondary"}
                  className="w-fit text-xs"
                >
                  {consultant.zoom_access_token ? "Connecté" : "Non connecté"}
                </Badge>
              </div>
            </div>

            {/* Onboarding progress */}
            {(() => {
              const checklist = [
                { label: "Bio renseignée", ok: !!consultant.bio },
                { label: "Stripe actif", ok: consultant.stripe_account_status === "active" },
                { label: "Zoom connecté", ok: !!consultant.zoom_access_token },
                {
                  label: "Au moins un lieu actif",
                  ok: (consultantLocations as { is_active: boolean }[]).some((l) => l.is_active),
                },
                {
                  label: "Au moins un type de consultation actif",
                  ok: (consultationTypes as { is_active?: boolean }[]).some(
                    (t) => t.is_active !== false
                  ),
                },
                { label: "Au moins une disponibilité", ok: (availabilities as unknown[]).length > 0 },
              ];
              const done = checklist.filter((c) => c.ok).length;
              const total = checklist.length;
              const pct = Math.round((done / total) * 100);

              return (
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Onboarding</span>
                    <span className="tabular-nums text-xs text-muted-foreground">
                      {done}/{total}
                    </span>
                  </div>
                  <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-1.5 rounded-full transition-all ${
                        pct === 100 ? "bg-green-500" : "bg-primary-green"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <ul className="space-y-1.5">
                    {checklist.map(({ label, ok }) => (
                      <li key={label} className="flex items-center gap-2">
                        {ok ? (
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-500" />
                        ) : (
                          <div className="h-3.5 w-3.5 shrink-0 rounded-full border-2 border-muted-foreground/30" />
                        )}
                        <span
                          className={`text-xs ${ok ? "text-foreground" : "text-muted-foreground"}`}
                        >
                          {label}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      </div>

      {/* Accompagnements */}
      <Card>
        <CardHeader>
          <CardTitle className="text-primary-green">
            Accompagnements ({formations.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {formations.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Aucun accompagnement associé.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Titre</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Prix</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {formations.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="font-medium">{f.title}</TableCell>
                    <TableCell>
                      <FormationStatusBadge status={f.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      {formatPrice(f.price_cents)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/admin/formations/${f.id}/edit`}>
                          Éditer
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Configuration du flow de réservation */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent>
            <AdminConsultationTypes
              consultantId={id}
              types={consultationTypes as Parameters<typeof AdminConsultationTypes>[0]["types"]}
              templates={consultationTypeTemplates}
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <AdminLocations
              consultantId={id}
              locations={consultantLocations as Parameters<typeof AdminLocations>[0]["locations"]}
              locationConfigs={locationConfigs}
            />
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardContent>
          <AdminAvailabilities
            consultantId={id}
            availabilities={availabilities as Parameters<typeof AdminAvailabilities>[0]["availabilities"]}
          />
        </CardContent>
      </Card>

      {/* Dernières réservations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-primary-green">
            Dernières réservations
          </CardTitle>
        </CardHeader>
        <CardContent>
          {bookings.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Aucune réservation.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell>
                      {new Date(b.starts_at).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                    <TableCell>
                      <BookingStatusBadge status={b.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const StatCard = ({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) => (
  <Card>
    <CardContent className="flex items-center gap-4">
      {icon}
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold text-primary-green">{value}</p>
      </div>
    </CardContent>
  </Card>
);

const StripeStatusBadge = ({ status }: { status: string | null }) => {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    active: { label: "Connecté", variant: "default" },
    pending: { label: "En attente", variant: "secondary" },
    restricted: { label: "Restreint", variant: "destructive" },
  };
  const config = map[status ?? "pending"] ?? {
    label: "Non configuré",
    variant: "outline" as const,
  };
  return <Badge variant={config.variant}>{config.label}</Badge>;
};

const FormationStatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
    published: { label: "Publiée", variant: "default" },
    draft: { label: "Brouillon", variant: "secondary" },
    archived: { label: "Archivée", variant: "outline" },
  };
  const config = map[status] ?? { label: status, variant: "outline" as const };
  return <Badge variant={config.variant}>{config.label}</Badge>;
};

const BookingStatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    confirmed: { label: "Confirmée", variant: "default" },
    pending: { label: "En attente", variant: "secondary" },
    cancelled: { label: "Annulée", variant: "destructive" },
    completed: { label: "Terminée", variant: "outline" },
    no_show: { label: "Absent", variant: "destructive" },
  };
  const config = map[status] ?? { label: status, variant: "outline" as const };
  return <Badge variant={config.variant}>{config.label}</Badge>;
};

export default ConsultantDetailPage;
