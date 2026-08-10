import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listContactMessages } from "./actions";
import { StatusFilter } from "./_components/status-filter";
import type { ContactMessageStatus } from "./actions";

const STATUS_LABELS: Record<ContactMessageStatus, string> = {
  nouveau: "Nouveau",
  lu: "Lu",
  traite: "Traité",
};

const STATUS_VARIANTS: Record<ContactMessageStatus, "default" | "outline" | "secondary"> = {
  nouveau: "default",
  lu: "secondary",
  traite: "outline",
};

const isStatus = (value: string | undefined): value is ContactMessageStatus =>
  value === "nouveau" || value === "lu" || value === "traite";

export default async function AdminContactPage({
  searchParams,
}: {
  searchParams: Promise<{ statut?: string }>;
}) {
  const { statut } = await searchParams;
  const statusFilter = isStatus(statut) ? statut : undefined;
  const messages = await listContactMessages(statusFilter);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl text-primary-green">Contact</h1>
          <p className="text-sm text-primary-green/60">
            Messages envoyés depuis le formulaire de contact du site.
          </p>
        </div>
        <StatusFilter />
      </div>

      {messages.length === 0 ? (
        <p className="text-primary-green/70">Aucun message pour le moment.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Sujet</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {messages.map((message) => (
                <TableRow key={message.id}>
                  <TableCell className="whitespace-nowrap">
                    {format(new Date(message.created_at), "d MMM yyyy HH:mm", {
                      locale: fr,
                    })}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/admin/contact/${message.id}`}
                      className="font-medium text-primary-green hover:underline"
                    >
                      {message.name}
                    </Link>
                  </TableCell>
                  <TableCell>{message.email}</TableCell>
                  <TableCell className="max-w-64 truncate">{message.subject}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANTS[message.status]}>
                      {STATUS_LABELS[message.status]}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
