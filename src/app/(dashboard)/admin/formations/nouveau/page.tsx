import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminFormationCreateForm } from "@/app/(dashboard)/admin/formations/_components/formation-create-form";

export const metadata: Metadata = {
  title: "Nouvel accompagnement",
};

const AdminNewFormationPage = async () => {
  const user = await getSessionUser();
  if (!user || !user.roles.includes("admin")) redirect("/connexion");

  const supabase = createAdminClient();
  const { data: consultants } = await supabase
    .from("consultants")
    .select("id, profiles!consultants_id_fkey(first_name, last_name)")
    .eq("is_active", true);

  type ConsultantRow = {
    id: string;
    profiles: { first_name: string | null; last_name: string | null } | null;
  };

  const defaultProfile = {
    first_name: null as string | null,
    last_name: null as string | null,
  };

  const options = (
    (consultants ?? []) as unknown as ConsultantRow[]
  )
    .map((c) => ({
      id: c.id,
      profiles: c.profiles ?? defaultProfile,
    }))
    .sort((a, b) => {
      const aName = `${a.profiles.last_name ?? ""} ${a.profiles.first_name ?? ""}`.trim();
      const bName = `${b.profiles.last_name ?? ""} ${b.profiles.first_name ?? ""}`.trim();
      return aName.localeCompare(bName);
    });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="font-serif text-2xl font-bold text-primary-green">
        Nouvel accompagnement
      </h1>
      <AdminFormationCreateForm consultants={options} />
    </div>
  );
};

export default AdminNewFormationPage;
