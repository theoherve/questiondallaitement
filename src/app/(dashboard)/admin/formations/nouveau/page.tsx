import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminFormationCreateForm } from "../_components/formation-create-form";

export const metadata: Metadata = {
  title: "Nouvelle formation",
};

const AdminNewFormationPage = async () => {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") redirect("/connexion");

  const supabase = createAdminClient();
  const { data: consultants } = await supabase
    .from("consultants")
    .select("id, profiles!consultants_id_fkey(first_name, last_name)")
    .eq("is_active", true);

  type ConsultantOption = {
    id: string;
    profiles: { first_name: string | null; last_name: string | null } | null;
  };

  const options = (
    (consultants ?? []) as unknown as ConsultantOption[]
  ).sort((a, b) => {
    const aName = `${a.profiles?.last_name ?? ""} ${a.profiles?.first_name ?? ""}`.trim();
    const bName = `${b.profiles?.last_name ?? ""} ${b.profiles?.first_name ?? ""}`.trim();
    return aName.localeCompare(bName);
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="font-serif text-2xl font-bold text-primary-green">
        Nouvelle formation
      </h1>
      <AdminFormationCreateForm consultants={options} />
    </div>
  );
};

export default AdminNewFormationPage;
