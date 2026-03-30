import { Metadata } from "next";
import { getSessionUser } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Mail, MousePointerClick, Eye, AlertTriangle, UserMinus } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { StatCard } from "@/components/dashboard/stat-card";
import { RefreshStatsButton } from "./_components/refresh-stats-button";
import type { CampaignStats } from "@/types/database";

export const metadata: Metadata = {
  title: "Statistiques campagne",
};

const CampaignStatsPage = async ({
  params,
}: {
  params: Promise<{ id: string }>;
}) => {
  const user = await getSessionUser();
  if (!user || !user.roles.includes("admin")) redirect("/connexion");

  const { id } = await params;
  const supabase = createAdminClient();

  const { data: campaign } = await supabase
    .from("email_campaigns")
    .select("*")
    .eq("id", id)
    .single();

  if (!campaign) notFound();

  const stats = (campaign.stats as CampaignStats | null) ?? null;

  const openRate =
    stats && stats.delivered > 0
      ? ((stats.unique_opens / stats.delivered) * 100).toFixed(1)
      : "—";

  const clickRate =
    stats && stats.delivered > 0
      ? ((stats.unique_clicks / stats.delivered) * 100).toFixed(1)
      : "—";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/marketing">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="font-serif text-2xl font-bold text-primary-green">
              {campaign.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              {campaign.subject}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={campaign.status === "sent" ? "default" : "secondary"}
          >
            {campaign.status === "sent"
              ? "Envoyée"
              : campaign.status === "scheduled"
                ? "Programmée"
                : "Brouillon"}
          </Badge>
          {campaign.brevo_campaign_id && (
            <RefreshStatsButton campaignId={campaign.id} />
          )}
        </div>
      </div>

      {/* Meta */}
      <Card>
        <CardContent className="flex gap-6 py-4 text-sm">
          <div>
            <span className="text-muted-foreground">Envoyée le : </span>
            {campaign.sent_at
              ? format(new Date(campaign.sent_at), "d MMM yyyy à HH:mm", {
                  locale: fr,
                })
              : "—"}
          </div>
          <div>
            <span className="text-muted-foreground">Créée le : </span>
            {format(new Date(campaign.created_at), "d MMM yyyy", {
              locale: fr,
            })}
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      {stats ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Délivrés"
              value={stats.delivered.toLocaleString("fr-FR")}
              icon={Mail}
            />
            <StatCard
              title="Taux d'ouverture"
              value={`${openRate}%`}
              description={`${stats.unique_opens} ouvertures uniques`}
              icon={Eye}
            />
            <StatCard
              title="Taux de clic"
              value={`${clickRate}%`}
              description={`${stats.unique_clicks} clics uniques`}
              icon={MousePointerClick}
            />
            <StatCard
              title="Bounces"
              value={stats.bounces.toLocaleString("fr-FR")}
              icon={AlertTriangle}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <h3 className="font-serif text-lg font-semibold text-primary-green">
                  Engagements
                </h3>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ouvertures totales</span>
                  <span className="font-medium">{stats.opens.toLocaleString("fr-FR")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ouvertures uniques</span>
                  <span className="font-medium">{stats.unique_opens.toLocaleString("fr-FR")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Clics totaux</span>
                  <span className="font-medium">{stats.clicks.toLocaleString("fr-FR")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Clics uniques</span>
                  <span className="font-medium">{stats.unique_clicks.toLocaleString("fr-FR")}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h3 className="font-serif text-lg font-semibold text-primary-green">
                  Délivrabilité
                </h3>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Délivrés</span>
                  <span className="font-medium">{stats.delivered.toLocaleString("fr-FR")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Bounces</span>
                  <span className="font-medium">{stats.bounces.toLocaleString("fr-FR")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Désabonnements</span>
                  <span className="font-medium">{stats.unsubscribes.toLocaleString("fr-FR")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Plaintes spam</span>
                  <span className="font-medium">{stats.spam_reports.toLocaleString("fr-FR")}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <UserMinus className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="text-muted-foreground">
              {campaign.brevo_campaign_id
                ? "Cliquez sur « Rafraîchir les stats » pour récupérer les données depuis Brevo."
                : "Aucune statistique disponible — la campagne n'a pas été envoyée via Brevo."}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Email preview */}
      {campaign.body_html && (
        <Card>
          <CardHeader>
            <h3 className="font-serif text-lg font-semibold text-primary-green">
              Aperçu du contenu
            </h3>
          </CardHeader>
          <CardContent>
            <div
              className="prose max-w-none rounded-lg border bg-white p-6"
              dangerouslySetInnerHTML={{ __html: campaign.body_html }}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CampaignStatsPage;
