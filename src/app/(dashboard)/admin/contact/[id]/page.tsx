import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getContactMessageForAdmin } from "../actions";
import { MarkTreatedButton } from "../_components/mark-treated-button";

export default async function AdminContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const message = await getContactMessageForAdmin(id);
  if (!message) notFound();

  const mailtoHref = `mailto:${message.email}?subject=${encodeURIComponent(`Re: ${message.subject}`)}`;

  return (
    <div className="max-w-2xl space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link href="/admin/contact">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Retour
        </Link>
      </Button>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl text-primary-green">{message.subject}</h1>
          <p className="mt-1 text-sm text-primary-green/60">
            {message.name} · {message.email} ·{" "}
            {format(new Date(message.created_at), "d MMM yyyy HH:mm", { locale: fr })}
          </p>
        </div>
        <Badge>{message.status === "traite" ? "Traité" : message.status === "lu" ? "Lu" : "Nouveau"}</Badge>
      </div>

      <p className="whitespace-pre-wrap rounded-lg border p-4 text-primary-green/90">
        {message.message}
      </p>

      <div className="flex gap-3">
        <Button asChild>
          <a href={mailtoHref}>Répondre</a>
        </Button>
        {message.status !== "traite" && <MarkTreatedButton id={message.id} />}
      </div>
    </div>
  );
}
