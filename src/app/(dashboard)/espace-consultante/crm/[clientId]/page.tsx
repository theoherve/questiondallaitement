import { Metadata } from "next";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  History,
  StickyNote,
  Tags,
  ArrowLeft,
  Mail,
  Phone,
  Clock,
  Baby,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import Link from "next/link";
import { getContactDetail, getTags, getChildrenForContact } from "../../crm/actions";
import { NotesEditor } from "../../crm/_components/notes-editor";
import { TagAssigner } from "../../crm/_components/tag-assigner";
import { InteractionTimeline } from "../../crm/_components/interaction-timeline";
import { ClientScore } from "../../crm/_components/client-score";
import { ChildrenPanel } from "../../crm/_components/children-panel";
import { createAdminClient } from "@/lib/supabase/admin";
import type { WeightMeasurement } from "@/types/database";

export const metadata: Metadata = {
  title: "Détail contact : CRM",
};

const ContactDetailPage = async ({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) => {
  const { clientId } = await params;
  const [contact, allTags, children] = await Promise.all([
    getContactDetail(clientId),
    getTags(),
    getChildrenForContact(clientId),
  ]);

  if (!contact) notFound();

  const { profile, score, interactions, notes, tags } = contact;

  const measurementsByChild: Record<string, WeightMeasurement[]> = {};
  if (children.length > 0) {
    const supabase = createAdminClient();
    const { data: allMeasurements } = await supabase
      .from("weight_measurements")
      .select("*")
      .in(
        "child_id",
        children.map((c) => c.id),
      )
      .order("measured_at", { ascending: true });
    for (const child of children) {
      measurementsByChild[child.id] = (allMeasurements ?? []).filter(
        (m) => m.child_id === child.id,
      );
    }
  }
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
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-2xl font-bold text-primary-green">
              {displayName}
            </h1>
            <ClientScore score={score} size="md" />
          </div>
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

      {/* Interactions Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary-green">
            <History className="h-5 w-5" />
            Historique interactions ({interactions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <InteractionTimeline interactions={interactions} />
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

      {/* Enfants */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary-green">
            <Baby className="h-5 w-5" />
            Enfants ({children.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChildrenPanel
            children={children}
            measurementsByChild={measurementsByChild}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default ContactDetailPage;
