import { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, Eye, Pencil, Mail, FileText, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { SyncButton } from "./_components/sync-button";

export const metadata: Metadata = {
  title: "Marketing",
};

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  draft: { label: "Brouillon", variant: "secondary" },
  scheduled: { label: "Programmée", variant: "outline" },
  sending: { label: "En cours", variant: "default" },
  sent: { label: "Envoyée", variant: "default" },
};

const TEMPLATE_TYPE_CONFIG: Record<
  string,
  { label: string; variant: "default" | "secondary" }
> = {
  transactional: { label: "Transactionnel", variant: "secondary" },
  marketing: { label: "Marketing", variant: "default" },
};

const MarketingPage = async () => {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") redirect("/connexion");

  const supabase = createAdminClient();

  const [campaignsRes, templatesRes] = await Promise.all([
    supabase
      .from("email_campaigns")
      .select("*, consultant:consultants(id, profiles(first_name, last_name))")
      .order("created_at", { ascending: false }),
    supabase
      .from("email_templates")
      .select("*")
      .order("created_at", { ascending: false }),
  ]);

  const campaigns = campaignsRes.data ?? [];
  const templates = templatesRes.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-bold text-primary-green">
          Marketing
        </h1>
        <div className="flex items-center gap-2">
          <SyncButton />
          <Button asChild>
            <Link href="/admin/marketing/campagnes/nouveau">
              <Plus className="mr-2 h-4 w-4" />
              Nouvelle campagne
            </Link>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="campaigns">
        <TabsList>
          <TabsTrigger value="campaigns">
            <Mail className="mr-2 h-4 w-4" />
            Campagnes ({campaigns.length})
          </TabsTrigger>
          <TabsTrigger value="templates">
            <FileText className="mr-2 h-4 w-4" />
            Templates ({templates.length})
          </TabsTrigger>
        </TabsList>

        {/* ─── Campaigns Tab ──────────────────────── */}
        <TabsContent value="campaigns" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {campaigns.length === 0 ? (
                <div className="py-12 text-center">
                  <Mail className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
                  <p className="text-muted-foreground">
                    Aucune campagne pour le moment.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead>Objet</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Consultante</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {campaigns.map((campaign) => {
                      const status = STATUS_CONFIG[campaign.status] ?? STATUS_CONFIG.draft;
                      const consultant = campaign.consultant as {
                        id: string;
                        profiles: { first_name: string; last_name: string } | null;
                      } | null;
                      const consultantName = consultant?.profiles
                        ? `${consultant.profiles.first_name} ${consultant.profiles.last_name}`
                        : "Admin";

                      return (
                        <TableRow key={campaign.id}>
                          <TableCell className="font-medium">
                            {campaign.name}
                          </TableCell>
                          <TableCell className="max-w-50 truncate text-muted-foreground">
                            {campaign.subject}
                          </TableCell>
                          <TableCell>
                            <Badge variant={status.variant}>{status.label}</Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {consultantName}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {campaign.sent_at
                              ? format(new Date(campaign.sent_at), "d MMM yyyy", { locale: fr })
                              : format(new Date(campaign.created_at), "d MMM yyyy", { locale: fr })}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {campaign.status === "sent" && campaign.brevo_campaign_id && (
                                <Button variant="ghost" size="icon" asChild>
                                  <Link href={`/admin/marketing/campagnes/${campaign.id}/stats`}>
                                    <RefreshCw className="h-4 w-4" />
                                  </Link>
                                </Button>
                              )}
                              {campaign.status === "draft" ? (
                                <Button variant="ghost" size="icon" asChild>
                                  <Link href={`/admin/marketing/campagnes/${campaign.id}/edit`}>
                                    <Pencil className="h-4 w-4" />
                                  </Link>
                                </Button>
                              ) : (
                                <Button variant="ghost" size="icon" asChild>
                                  <Link href={`/admin/marketing/campagnes/${campaign.id}/stats`}>
                                    <Eye className="h-4 w-4" />
                                  </Link>
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Templates Tab ──────────────────────── */}
        <TabsContent value="templates" className="mt-4">
          <div className="mb-4 flex justify-end">
            <Button asChild variant="outline">
              <Link href="/admin/marketing/templates/nouveau">
                <Plus className="mr-2 h-4 w-4" />
                Nouveau template
              </Link>
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              {templates.length === 0 ? (
                <div className="py-12 text-center">
                  <FileText className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
                  <p className="text-muted-foreground">
                    Aucun template pour le moment.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead>Objet</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Modifié le</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {templates.map((template) => {
                      const typeConfig =
                        TEMPLATE_TYPE_CONFIG[template.type] ??
                        TEMPLATE_TYPE_CONFIG.transactional;

                      return (
                        <TableRow key={template.id}>
                          <TableCell className="font-medium">
                            {template.name}
                          </TableCell>
                          <TableCell className="max-w-50 truncate text-muted-foreground">
                            {template.subject}
                          </TableCell>
                          <TableCell>
                            <Badge variant={typeConfig.variant}>
                              {typeConfig.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {format(new Date(template.updated_at), "d MMM yyyy", {
                              locale: fr,
                            })}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" asChild>
                              <Link href={`/admin/marketing/templates/${template.id}/edit`}>
                                <Pencil className="h-4 w-4" />
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MarketingPage;
