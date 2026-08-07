import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Pencil } from "lucide-react";
import {
  FormationDetail,
  type FormationDetailConsultant,
  type FormationDetailProps,
} from "@/app/(public)/formations/[slug]/_components/formation-detail";

type Props = {
  params: Promise<{ id: string }>;
};

export const generateMetadata = async ({
  params,
}: Props): Promise<Metadata> => {
  const { id } = await params;
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("events")
    .select("title")
    .eq("id", id)
    .single();

  return {
    title: data ? `Aperçu — ${data.title}` : "Aperçu introuvable",
    robots: { index: false, follow: false },
  };
};

const FormationPreviewPage = async ({ params }: Props) => {
  const user = await getSessionUser();
  if (!user || !user.roles.includes("admin")) redirect("/connexion");

  const { id } = await params;

  // Client admin et pas de filtre `is_published` : l'interet de l'apercu est
  // justement de voir un brouillon tel qu'il sera publie.
  const supabase = createAdminClient();
  const { data: formation } = await supabase
    .from("events")
    .select(
      `
      *,
      consultants (
        slug,
        profiles!consultants_id_fkey (
          first_name,
          last_name,
          avatar_url
        )
      )
    `
    )
    .eq("id", id)
    .single();

  if (!formation) notFound();

  const { count } = await supabase
    .from("event_registrations")
    .select("*", { count: "exact", head: true })
    .eq("event_id", formation.id)
    .eq("status", "registered");

  const registrationsCount = count ?? 0;
  const consultant = formation.consultants as unknown as FormationDetailConsultant;

  return (
    // Les marges negatives annulent la gouttiere du gabarit d'administration
    // (`p-4 sm:p-6 lg:p-8`) pour que le bandeau aille bord a bord, comme en
    // public.
    <div className="-m-4 sm:-m-6 lg:-m-8">
      <div className="sticky top-0 z-50 flex flex-wrap items-center justify-between gap-3 border-b border-primary-green/10 bg-accent-honey-soft px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/formations">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <p className="text-sm font-medium text-primary-green">
            Aperçu — {formation.is_published ? "publié" : "brouillon"}. Cette page
            n’est pas visible du public.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href={`/admin/formations/${id}/edit`}>
            <Pencil className="mr-2 h-4 w-4" />
            Modifier
          </Link>
        </Button>
      </div>

      <FormationDetail
        formation={formation as FormationDetailProps["formation"]}
        consultant={consultant}
        isAlreadyRegistered={false}
        isFullyBooked={false}
        registrationsCount={registrationsCount}
        isAuthenticated={false}
        awaitingRegistration={false}
        isPreview
      />
    </div>
  );
};

export default FormationPreviewPage;
