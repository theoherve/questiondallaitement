import { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Plus, Eye, Pencil, Mail } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export const metadata: Metadata = {
  title: "Emails",
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

const EmailsPage = async () => {
  const user = await getSessionUser();
  if (!user || (user.role !== "consultant" && user.role !== "admin")) {
    redirect("/connexion");
  }

  const supabase = createAdminClient();

  // Fetch campaigns and assigned lists
  const [campaignsRes, listsRes] = await Promise.all([
    supabase
      .from("email_campaigns")
      .select("*")
      .eq("consultant_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("consultant_brevo_lists")
      .select("*")
      .eq("consultant_id", user.id),
  ]);

  const campaigns = campaignsRes.data ?? [];
  const assignedLists = listsRes.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-bold text-primary-green">
          Campagnes email
        </h1>
        {assignedLists.length > 0 && (
          <Button asChild>
            <Link href="/espace-consultante/emails/nouveau">
              <Plus className="mr-2 h-4 w-4" />
              Nouvelle campagne
            </Link>
          </Button>
        )}
      </div>

      {assignedLists.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Mail className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="text-muted-foreground">
              Aucune liste d&apos;envoi ne vous a été attribuée.
            </p>
            <p className="text-sm text-muted-foreground">
              Contactez l&apos;administrateur pour qu&apos;il vous assigne des listes Brevo.
            </p>
          </CardContent>
        </Card>
      ) : (
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
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map((campaign) => {
                    const status =
                      STATUS_CONFIG[campaign.status] ?? STATUS_CONFIG.draft;

                    return (
                      <TableRow key={campaign.id}>
                        <TableCell className="font-medium">
                          {campaign.name}
                        </TableCell>
                        <TableCell className="max-w-50 truncate text-muted-foreground">
                          {campaign.subject}
                        </TableCell>
                        <TableCell>
                          <Badge variant={status.variant}>
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {campaign.sent_at
                            ? format(new Date(campaign.sent_at), "d MMM yyyy", {
                                locale: fr,
                              })
                            : format(new Date(campaign.created_at), "d MMM yyyy", {
                                locale: fr,
                              })}
                        </TableCell>
                        <TableCell className="text-right">
                          {campaign.status === "draft" ? (
                            <Button variant="ghost" size="icon" asChild>
                              <Link
                                href={`/espace-consultante/emails/${campaign.id}/edit`}
                              >
                                <Pencil className="h-4 w-4" />
                              </Link>
                            </Button>
                          ) : (
                            <Button variant="ghost" size="icon" asChild>
                              <Link
                                href={`/espace-consultante/emails/${campaign.id}/stats`}
                              >
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EmailsPage;
