import { Metadata } from "next";
import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect, notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Mail, MousePointerClick, Eye, AlertTriangle, UserMinus } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { StatCard } from "@/components/dashboard/stat-card";
import { ConsultantRefreshStatsButton } from "./_components/refresh-stats-button";
import type { CampaignStats } from "@/types/database";

export const metadata: Metadata = {
  title: "Statistiques campagne",
};

const ConsultantCampaignStatsPage = async ({
  params,
}: {
  params: Promise<{ id: string }>;
}) => {
  const user = await getSessionUser();
  if (!user || (!user.roles.includes("consultant") && !user.roles.includes("admin"))) {
    redirect("/connexion");
  }

  const { id } = await params;
  const supabase = createAdminClient();

  const { data: campaign } = await supabase
    .from("email_campaigns")
    .select("*")
    .eq("id", id)
    .eq("consultant_id", user.id)
    .single();

  if (!campaign) notFound();

  const stats = (campaign.stats as CampaignStats | null) ?? null;

  const openRate =
    stats && stats.delivered > 0
      ? ((stats.unique_opens / stats.delivered) * 100).toFixed(1)
      : "-";

  const clickRate =
    stats && stats.delivered > 0
      ? ((stats.unique_clicks / stats.delivered) * 100).toFixed(1)
      : "-";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/espace-consultante/emails">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="font-serif text-2xl font-bold text-primary-green">
              {campaign.name}
            </h1>
            <p className="text-sm text-muted-foreground">{campaign.subject}</p>
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
            <ConsultantRefreshStatsButton campaignId={campaign.id} />
          )}
        </div>
      </div>

      <Card>
        <CardContent className="flex gap-6 py-4 text-sm">
          <div>
            <span className="text-muted-foreground">Envoyée le : </span>
            {campaign.sent_at
              ? format(new Date(campaign.sent_at), "d MMM yyyy à HH:mm", {
                  locale: fr,
                })
              : "-"}
          </div>
        </CardContent>
      </Card>

      {stats ? (
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
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <UserMinus className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="text-muted-foreground">
              {campaign.brevo_campaign_id
                ? "Cliquez sur « Rafraîchir les stats » pour récupérer les données depuis Brevo."
                : "Aucune statistique disponible."}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ConsultantCampaignStatsPage;
