import { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
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
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { getMemoUrl } from "@/lib/newsletter/welcome-email";
import { MemoUpload } from "./_components/memo-upload";

export const metadata: Metadata = {
  title: "Newsletter",
};

type Subscriber = {
  id: string;
  email: string;
  first_name: string;
  source: string;
  consented_at: string;
  brevo_synced_at: string | null;
  brevo_sync_error: string | null;
  welcome_email_sent_at: string | null;
  welcome_email_error: string | null;
  unsubscribed_at: string | null;
  created_at: string;
};

const SOURCE_LABELS: Record<string, string> = {
  page_newsletter: "Page dédiée",
  homepage_teaser: "Accueil",
};

const NewsletterSubscribersPage = async () => {
  const user = await getSessionUser();
  if (!user || !user.roles.includes("admin")) redirect("/connexion");

  const supabase = createAdminClient();

  const [subscribersRes, viewsRes, memoUrl] = await Promise.all([
    supabase
      .from("newsletter_subscribers")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("newsletter_events")
      .select("source", { count: "exact" })
      .eq("type", "page_view"),
    getMemoUrl(),
  ]);

  const subscribers = (subscribersRes.data ?? []) as Subscriber[];
  const pageViews = viewsRes.count ?? 0;

  const active = subscribers.filter((s) => !s.unsubscribed_at);
  const pendingSync = subscribers.filter(
    (s) => !s.brevo_synced_at && !s.unsubscribed_at,
  );

  // Taux de conversion de la page dediee. Le teaser d'accueil n'est pas compte
  // au denominateur : il ne porte pas de formulaire, ses visiteurs passent
  // forcement par la page dediee et seraient comptes deux fois.
  const conversionRate =
    pageViews > 0
      ? Math.round(
          (subscribers.filter((s) => s.source === "page_newsletter").length /
            pageViews) *
            1000,
        ) / 10
      : null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl font-bold">Newsletter</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Inscrits et mesure d&apos;audience. Les 200 inscriptions les plus
          récentes.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Abonnés actifs" value={String(active.length)} />
        <StatCard label="Visites de la page" value={String(pageViews)} />
        <StatCard
          label="Taux de conversion"
          value={conversionRate === null ? "—" : `${conversionRate} %`}
        />
        <StatCard
          label="À resynchroniser"
          value={String(pendingSync.length)}
          alert={pendingSync.length > 0}
        />
      </div>

      <Card>
        <CardContent className="pt-6">
          <MemoUpload currentUrl={memoUrl} />
        </CardContent>
      </Card>

      {pendingSync.length > 0 && (
        <Card>
          <CardContent className="pt-6 text-sm">
            <p className="font-medium">
              {pendingSync.length} inscription
              {pendingSync.length > 1 ? "s" : ""} n&apos;
              {pendingSync.length > 1 ? "ont" : "a"} pas atteint Brevo.
            </p>
            <p className="mt-1 text-muted-foreground">
              Le consentement est bien enregistré ici — seul l&apos;ajout à la
              liste Brevo a échoué. Cause la plus fréquente : la liste blanche
              d&apos;adresses IP du compte Brevo, que les fonctions Vercel ne
              peuvent pas satisfaire.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          {subscribers.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Aucune inscription pour le moment.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Prénom</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Consentement</TableHead>
                  <TableHead>Brevo</TableHead>
                  <TableHead>Bienvenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscribers.map((subscriber) => (
                  <TableRow key={subscriber.id}>
                    <TableCell className="font-medium">
                      {subscriber.first_name}
                    </TableCell>
                    <TableCell>
                      {subscriber.email}
                      {subscriber.unsubscribed_at && (
                        <Badge variant="outline" className="ml-2">
                          Désinscrit
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {SOURCE_LABELS[subscriber.source] ?? subscriber.source}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(subscriber.consented_at), "d MMM yyyy", {
                        locale: fr,
                      })}
                    </TableCell>
                    <TableCell>
                      {subscriber.brevo_synced_at ? (
                        <Badge variant="secondary">Synchronisé</Badge>
                      ) : (
                        <Badge variant="destructive" title={subscriber.brevo_sync_error ?? undefined}>
                          En échec
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {subscriber.welcome_email_sent_at ? (
                        <Badge variant="secondary">Envoyé</Badge>
                      ) : (
                        <Badge
                          variant="destructive"
                          title={subscriber.welcome_email_error ?? undefined}
                        >
                          Non envoyé
                        </Badge>
                      )}
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
  label,
  value,
  alert,
}: {
  label: string;
  value: string;
  alert?: boolean;
}) => (
  <Card>
    <CardContent className="pt-6">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p
        className={`mt-1 font-serif text-3xl font-bold ${alert ? "text-destructive" : ""}`}
      >
        {value}
      </p>
    </CardContent>
  </Card>
);

export default NewsletterSubscribersPage;
