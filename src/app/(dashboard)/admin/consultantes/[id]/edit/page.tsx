import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { EditConsultantForm } from "../../_components/edit-consultant-form";

type Props = {
  params: Promise<{ id: string }>;
};

export const generateMetadata = async ({
  params,
}: Props): Promise<Metadata> => {
  const { id } = await params;
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("consultants")
    .select("profiles!consultants_id_fkey (first_name, last_name)")
    .eq("id", id)
    .single();

  const profile = data?.profiles as unknown as {
    first_name: string | null;
    last_name: string | null;
  } | null;
  const name = profile
    ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim()
    : "Consultante";

  return { title: `Modifier ${name}` };
};

const EditConsultantPage = async ({ params }: Props) => {
  const user = await getSessionUser();
  if (!user || !user.roles.includes("admin")) redirect("/admin");

  const { id } = await params;
  const supabase = createAdminClient();

  const { data: consultant } = await supabase
    .from("consultants")
    .select(
      `
      id,
      slug,
      bio,
      specialties,
      commission_rate,
      is_active,
      profiles!consultants_id_fkey (
        first_name,
        last_name,
        email
      )
    `
    )
    .eq("id", id)
    .single();

  if (!consultant) notFound();

  const profile = consultant.profiles as unknown as {
    first_name: string | null;
    last_name: string | null;
    email: string;
  };

  const fullName =
    `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() ||
    "Sans nom";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="font-serif text-2xl font-bold text-primary-green">
        Modifier {fullName}
      </h1>
      <p className="text-sm text-muted-foreground">{profile.email}</p>
      <EditConsultantForm
        consultant={{
          id: consultant.id,
          slug: consultant.slug,
          bio: consultant.bio ?? "",
          specialties: (consultant.specialties as string[]) ?? [],
          commission_rate: consultant.commission_rate,
          is_active: consultant.is_active ?? false,
        }}
      />
    </div>
  );
};

export default EditConsultantPage;
