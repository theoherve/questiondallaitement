import { Metadata } from "next";
import { getSupabaseAndUser } from "@/lib/supabase/server-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Euro } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export const metadata: Metadata = {
  title: "Mes formations",
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

const ConsultantFormationsPage = async () => {
  const { supabase, user } = await getSupabaseAndUser();

  const [formationsRes, enrollmentsRes, paymentsRes] = await Promise.all([
    supabase
      .from("formations")
      .select("id, title, slug, status, price_cents, created_at, published_at")
      .eq("consultant_id", user.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("formation_enrollments")
      .select("formation_id")
      .in(
        "formation_id",
        (
          await supabase
            .from("formations")
            .select("id")
            .eq("consultant_id", user.id)
            .is("deleted_at", null)
        ).data?.map((f) => f.id) ?? []
      ),
    supabase
      .from("payments")
      .select("reference_id, amount_cents, platform_fee_cents")
      .eq("consultant_id", user.id)
      .eq("type", "formation")
      .eq("status", "succeeded"),
  ]);

  const formations = formationsRes.data ?? [];
  const enrollments = enrollmentsRes.data ?? [];
  const payments = paymentsRes.data ?? [];

  const getEnrollmentCount = (formationId: string) =>
    enrollments.filter((e) => e.formation_id === formationId).length;

  const getRevenue = (formationId: string) =>
    payments
      .filter((p) => p.reference_id === formationId)
      .reduce((sum, p) => sum + (p.amount_cents - p.platform_fee_cents), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-bold text-primary-green">
          Mes formations
        </h1>
        <p className="text-sm text-muted-foreground">
          Lecture seule — les formations sont gérées par l&apos;administration
        </p>
      </div>

      {formations.length > 0 ? (
        <div className="space-y-3">
          {formations.map((formation) => {
            const config =
              STATUS_CONFIG[formation.status] ?? STATUS_CONFIG.draft;
            const enrollmentCount = getEnrollmentCount(formation.id);
            const revenue = getRevenue(formation.id);

            return (
              <Card key={formation.id}>
                <CardContent className="flex items-center justify-between py-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-primary-green">
                        {formation.title}
                      </h3>
                      <Badge variant={config.variant}>{config.label}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatPrice(formation.price_cents)} &middot; Créée le{" "}
                      {format(new Date(formation.created_at), "d MMM yyyy", {
                        locale: fr,
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span
                      className="flex items-center gap-1"
                      title="Inscrits"
                    >
                      <Users className="h-3.5 w-3.5" />
                      {enrollmentCount}
                    </span>
                    <span
                      className="flex items-center gap-1"
                      title="Revenus nets"
                    >
                      <Euro className="h-3.5 w-3.5" />
                      {formatPrice(revenue)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              Aucune formation associée à votre profil.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ConsultantFormationsPage;
