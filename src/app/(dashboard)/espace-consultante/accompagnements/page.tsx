import { Metadata } from "next";
import { getSupabaseAndUser } from "@/lib/supabase/server-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Euro, Handshake } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export const metadata: Metadata = {
  title: "Mes accompagnements",
};

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: "default" | "secondary" | "outline" }
> = {
  draft: { label: "Brouillon", variant: "secondary" },
  published: { label: "Publiée", variant: "default" },
  archived: { label: "Archivée", variant: "outline" },
};

const formatPrice = (cents: number): string =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);

const ConsultantAccompagnementsPage = async () => {
  const { supabase, user } = await getSupabaseAndUser();

  // Get accompagnements owned by this consultant
  const { data: ownedAccompagnements } = await supabase
    .from("accompagnements")
    .select("id, title, slug, status, price_cents, created_at, published_at")
    .eq("consultant_id", user.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  // Get accompagnements where this consultant is a collaborator
  const { data: collaborations } = await supabase
    .from("accompagnement_collaborators")
    .select("accompagnement_id, revenue_share")
    .eq("consultant_id", user.id);

  const collabAccompagnementIds = (collaborations ?? []).map(
    (c) => c.accompagnement_id,
  );
  const collabShareMap = new Map(
    (collaborations ?? []).map((c) => [c.accompagnement_id, Number(c.revenue_share)]),
  );

  let collabAccompagnements: typeof ownedAccompagnements = [];
  if (collabAccompagnementIds.length > 0) {
    const { data } = await supabase
      .from("accompagnements")
      .select(
        "id, title, slug, status, price_cents, created_at, published_at",
      )
      .in("id", collabAccompagnementIds)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    collabAccompagnements = data;
  }

  const allAccompagnementIds = [
    ...(ownedAccompagnements ?? []).map((f) => f.id),
    ...collabAccompagnementIds,
  ];

  const [enrollmentsRes, paymentsRes] = await Promise.all([
    allAccompagnementIds.length > 0
      ? supabase
          .from("accompagnement_enrollments")
          .select("accompagnement_id")
          .in("accompagnement_id", allAccompagnementIds)
      : Promise.resolve({ data: [] }),
    supabase
      .from("payments")
      .select("reference_id, amount_cents, platform_fee_cents")
      .eq("consultant_id", user.id)
      .eq("type", "accompagnement")
      .eq("status", "succeeded"),
  ]);

  const enrollments = enrollmentsRes.data ?? [];
  const payments = paymentsRes.data ?? [];

  const getEnrollmentCount = (accompagnementId: string) =>
    enrollments.filter((e) => e.accompagnement_id === accompagnementId).length;

  const getRevenue = (accompagnementId: string) =>
    payments
      .filter((p) => p.reference_id === accompagnementId)
      .reduce((sum, p) => sum + (p.amount_cents - p.platform_fee_cents), 0);

  const renderAccompagnementCard = (
    accompagnement: NonNullable<typeof ownedAccompagnements>[number],
    isCollab: boolean,
  ) => {
    const config = STATUS_CONFIG[accompagnement.status] ?? STATUS_CONFIG.draft;
    const enrollmentCount = getEnrollmentCount(accompagnement.id);
    const revenue = getRevenue(accompagnement.id);
    const share = collabShareMap.get(accompagnement.id);

    return (
      <Card key={accompagnement.id}>
        <CardContent className="flex items-center justify-between py-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-primary-green">
                {accompagnement.title}
              </h3>
              <Badge variant={config.variant}>{config.label}</Badge>
              {isCollab && (
                <Badge variant="secondary" className="gap-1">
                  <Handshake className="h-3 w-3" />
                  Co-création ({share}%)
                </Badge>
              )}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatPrice(accompagnement.price_cents)} &middot; Créée le{" "}
              {format(new Date(accompagnement.created_at), "d MMM yyyy", {
                locale: fr,
              })}
            </p>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1" title="Inscrits">
              <Users className="h-3.5 w-3.5" />
              {enrollmentCount}
            </span>
            <span className="flex items-center gap-1" title="Revenus nets">
              <Euro className="h-3.5 w-3.5" />
              {isCollab && share
                ? formatPrice(Math.round(revenue * (share / 100)))
                : formatPrice(revenue)}
            </span>
          </div>
        </CardContent>
      </Card>
    );
  };

  const hasAny =
    (ownedAccompagnements?.length ?? 0) + (collabAccompagnements?.length ?? 0) > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-bold text-primary-green">
          Mes accompagnements
        </h1>
        <p className="text-sm text-muted-foreground">
          Lecture seule, les accompagnements sont gérés par l&apos;administration
        </p>
      </div>

      {hasAny ? (
        <div className="space-y-3">
          {(ownedAccompagnements ?? []).map((f) => renderAccompagnementCard(f, false))}
          {(collabAccompagnements ?? []).map((f) => renderAccompagnementCard(f, true))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              Aucun accompagnement associé à votre profil.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ConsultantAccompagnementsPage;
