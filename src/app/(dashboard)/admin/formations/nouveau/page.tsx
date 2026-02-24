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
    .select("id, profiles!inner(first_name, last_name)")
    .eq("is_active", true)
    .order("profiles(last_name)");

  type ConsultantOption = {
    id: string;
    profiles: { first_name: string | null; last_name: string | null };
  };

  const options = (consultants ?? []) as unknown as ConsultantOption[];

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
