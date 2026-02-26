import { Metadata } from "next";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CalendarDays,
  GraduationCap,
  StickyNote,
  Tags,
  ArrowLeft,
  Mail,
  Phone,
  Clock,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import Link from "next/link";
import { getContactDetail, getTags } from "../../crm/actions";
import { NotesEditor } from "../../crm/_components/notes-editor";
import { TagAssigner } from "../../crm/_components/tag-assigner";

export const metadata: Metadata = {
  title: "Détail contact — CRM",
};

const BOOKING_STATUS: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  confirmed: { label: "Confirmé", variant: "default" },
  pending: { label: "En attente", variant: "secondary" },
  completed: { label: "Terminé", variant: "outline" },
  cancelled: { label: "Annulé", variant: "destructive" },
  no_show: { label: "Absent", variant: "destructive" },
};

const ContactDetailPage = async ({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) => {
  const { clientId } = await params;
  const [contact, allTags] = await Promise.all([
    getContactDetail(clientId),
    getTags(),
  ]);

  if (!contact) notFound();

  const { profile, bookings, enrollments, notes, tags } = contact;
  const displayName =
    profile.first_name || profile.last_name
      ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim()
      : profile.email;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/espace-consultante/crm"
          className="rounded-md p-2 hover:bg-muted"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="font-serif text-2xl font-bold text-primary-green">
            {displayName}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Mail className="h-3.5 w-3.5" />
              {profile.email}
            </span>
            {profile.phone && (
              <span className="flex items-center gap-1">
                <Phone className="h-3.5 w-3.5" />
                {profile.phone}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              Client depuis le{" "}
              {format(new Date(profile.created_at), "d MMM yyyy", {
                locale: fr,
              })}
            </span>
          </div>
        </div>
      </div>

      {/* Tags */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm text-primary-green">
            <Tags className="h-4 w-4" />
            Tags
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TagAssigner
            clientId={clientId}
            assignedTags={tags}
            allTags={allTags}
          />
        </CardContent>
      </Card>

      {/* Bookings History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary-green">
            <CalendarDays className="h-5 w-5" />
            Consultations ({bookings.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {bookings.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.map((booking) => {
                  const config =
                    BOOKING_STATUS[booking.status] ?? BOOKING_STATUS.pending;
                  return (
                    <TableRow key={booking.id}>
                      <TableCell>
                        {format(
                          new Date(booking.starts_at),
                          "d MMM yyyy 'à' HH:mm",
                          { locale: fr },
                        )}
                      </TableCell>
                      <TableCell>
                        {booking.consultation_types?.title ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={config.variant}>{config.label}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Aucune consultation avec ce client.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Enrollments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary-green">
            <GraduationCap className="h-5 w-5" />
            Formations ({enrollments.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {enrollments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Formation</TableHead>
                  <TableHead>Inscrit le</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enrollments.map((enrollment) => (
                  <TableRow key={enrollment.formation_id}>
                    <TableCell className="font-medium">
                      {enrollment.formations?.title ?? "—"}
                    </TableCell>
                    <TableCell>
                      {format(new Date(enrollment.enrolled_at), "d MMM yyyy", {
                        locale: fr,
                      })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Aucune inscription en formation.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary-green">
            <StickyNote className="h-5 w-5" />
            Notes ({notes.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <NotesEditor clientId={clientId} notes={notes} />
        </CardContent>
      </Card>
    </div>
  );
};

export default ContactDetailPage;
