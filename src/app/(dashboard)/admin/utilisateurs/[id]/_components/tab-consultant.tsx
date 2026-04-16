import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  TrendingUp,
  Video,
} from "lucide-react";

type ConsultantData = {
  id: string;
  slug: string;
  bio: string | null;
  specialties: string[];
  commission_rate: number;
  is_active: boolean;
  stripe_account_id: string | null;
  stripe_account_status: string;
  zoom_access_token: string | null;
  onboarding_completed: boolean;
  created_at: string;
};

type ConsultationType = {
  id: string;
  title: string;
  duration_minutes: number;
  price_cents: number;
  is_active: boolean;
};

type Stats = {
  totalBookings: number;
  totalRevenue: number;
  activeConsultationTypes: number;
};

const formatPrice = (cents: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(
    cents / 100,
  );

export const TabConsultant = ({
  consultant,
  consultationTypes,
  stats,
}: {
  consultant: ConsultantData;
  consultationTypes: ConsultationType[];
  stats: Stats;
}) => {
  return (
    <div className="space-y-6">
      {/* Link to full consultant page */}
      <div className="flex justify-end">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/admin/consultantes/${consultant.id}`}>
            <ExternalLink className="mr-2 h-4 w-4" />
            Voir la fiche consultante complète
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={<CalendarDays className="h-5 w-5 text-primary-green" />}
          label="Réservations reçues"
          value={stats.totalBookings.toString()}
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5 text-primary-green" />}
          label="Revenus totaux"
          value={formatPrice(stats.totalRevenue)}
        />
        <StatCard
          icon={<BookOpen className="h-5 w-5 text-primary-green" />}
          label="Types de consultation actifs"
          value={stats.activeConsultationTypes.toString()}
        />
      </div>

      {/* Profile info */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-primary-green">Profil consultante</CardTitle>
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
                {(consultant.specialties ?? []).length > 0 ? (
                  consultant.specialties.map((s) => (
                    <Badge key={s} variant="secondary">
                      {s}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">Aucune</span>
                )}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Commission
              </p>
              <p className="text-sm">{consultant.commission_rate}%</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Statut
              </p>
              <Badge variant={consultant.is_active ? "default" : "secondary"}>
                {consultant.is_active ? "Active" : "Inactive"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-primary-green">Intégrations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-3">
                <div className="flex items-center gap-1.5">
                  <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">
                    Stripe
                  </span>
                </div>
                <Badge
                  variant={
                    consultant.stripe_account_status === "active"
                      ? "default"
                      : "secondary"
                  }
                  className="w-fit text-xs"
                >
                  {consultant.stripe_account_status === "active"
                    ? "Connecté"
                    : "En attente"}
                </Badge>
              </div>
              <div className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-3">
                <div className="flex items-center gap-1.5">
                  <Video className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">
                    Zoom
                  </span>
                </div>
                <Badge
                  variant={consultant.zoom_access_token ? "default" : "secondary"}
                  className="w-fit text-xs"
                >
                  {consultant.zoom_access_token ? "Connecté" : "Non connecté"}
                </Badge>
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  Onboarding
                </span>
                <Badge
                  variant={
                    consultant.onboarding_completed ? "default" : "secondary"
                  }
                  className="text-xs"
                >
                  {consultant.onboarding_completed ? (
                    <>
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      Complété
                    </>
                  ) : (
                    "En cours"
                  )}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Consultation types */}
      <Card>
        <CardHeader>
          <CardTitle className="text-primary-green">
            Types de consultation ({consultationTypes.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {consultationTypes.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Aucun type de consultation.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Titre</TableHead>
                  <TableHead>Durée</TableHead>
                  <TableHead className="text-right">Prix</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {consultationTypes.map((ct) => (
                  <TableRow key={ct.id}>
                    <TableCell className="font-medium">{ct.title}</TableCell>
                    <TableCell>{ct.duration_minutes} min</TableCell>
                    <TableCell className="text-right">
                      {formatPrice(ct.price_cents)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={ct.is_active ? "default" : "secondary"}
                      >
                        {ct.is_active ? "Actif" : "Inactif"}
                      </Badge>
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
