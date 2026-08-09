import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { EditSegmentForm } from "./_form";
import { getTags } from "../../../actions";
import type { CrmSegment } from "@/types/database";

export const metadata: Metadata = {
  title: "Modifier le segment : CRM",
};

const EditSegmentPage = async ({
  params,
}: {
  params: Promise<{ id: string }>;
}) => {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user || (!user.roles.includes("consultant") && !user.roles.includes("admin")))
    redirect("/connexion");

  const supabase = createAdminClient();
  const { data: segment } = await supabase
    .from("crm_segments")
    .select("*")
    .eq("id", id)
    .eq("consultant_id", user.id)
    .single();

  if (!segment) notFound();

  const tags = await getTags();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/espace-consultante/crm/segments"
          className="rounded-md p-2 hover:bg-muted"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="font-serif text-2xl font-bold text-primary-green">
          Modifier le segment
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-primary-green">{segment.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <EditSegmentForm segment={segment as CrmSegment} tags={tags} />
        </CardContent>
      </Card>
    </div>
  );
};

export default EditSegmentPage;
