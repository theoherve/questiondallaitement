"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import {
  Trash2,
  Users,
  CreditCard,
  UserPlus,
  ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EnrollModal } from "./enroll-modal";
import { unenrollFromFormation } from "@/app/(dashboard)/admin/formations/[id]/enroll-actions";
import { formatClientName } from "./enrollment-utils";

export type EnrollmentRow = {
  id: string;
  enrolled_at: string;
  source: "stripe" | "manual";
  client: {
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
  };
};

type EnrollmentsSheetProps = {
  formationId: string;
  formationTitle: string;
  enrollments: EnrollmentRow[];
};

export const EnrollmentsSheet = ({
  formationId,
  formationTitle,
  enrollments,
}: EnrollmentsSheetProps) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleUnenroll = (enrollmentId: string) => {
    if (!confirm("Retirer cet utilisateur de l'accompagnement ?")) return;
    startTransition(async () => {
      const result = await unenrollFromFormation(enrollmentId);
      if (result.success) {
        toast.success("Utilisateur retiré");
        router.refresh();
      } else {
        toast.error(result.error ?? "Erreur");
      }
    });
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Users className="h-4 w-4" />
          Participants
          <Badge
            variant="secondary"
            className="ml-1 rounded-full px-2 py-0 text-xs"
          >
            {enrollments.length}
          </Badge>
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-2xl"
      >
        <SheetHeader className="border-b px-6 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <SheetTitle className="flex items-center gap-2 text-primary-green">
                <Users className="h-5 w-5" />
                Participants
                <Badge variant="secondary" className="rounded-full">
                  {enrollments.length}
                </Badge>
              </SheetTitle>
              <SheetDescription className="mt-1 text-left">
                Inscrits à <strong>{formationTitle}</strong>
              </SheetDescription>
            </div>
            <EnrollModal
              formationId={formationId}
              formationTitle={formationTitle}
              trigger={
                <Button size="sm">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Ajouter
                </Button>
              }
            />
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {enrollments.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center py-12 text-center">
              <Users className="mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="mb-1 text-sm font-medium">Aucun participant</p>
              <p className="text-xs text-muted-foreground">
                Ajoute manuellement un utilisateur ou attends ses inscriptions
                Stripe.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Utilisateur</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enrollments.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="max-w-45">
                      <div className="flex flex-col">
                        <Link
                          href={`/admin/utilisateurs/${e.client.id}`}
                          className="truncate font-medium hover:underline"
                        >
                          {formatClientName(e.client)}
                        </Link>
                        <span className="truncate text-xs text-muted-foreground">
                          {e.client.email}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {e.source === "manual" ? (
                        <Badge variant="outline" className="gap-1">
                          <UserPlus className="h-3 w-3" />
                          Manuel
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1">
                          <CreditCard className="h-3 w-3" />
                          Stripe
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(e.enrolled_at).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/admin/utilisateurs/${e.client.id}`}>
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                      </Button>
                      {e.source === "manual" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={isPending}
                          onClick={() => handleUnenroll(e.id)}
                          title="Retirer"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
