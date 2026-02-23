import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const DashboardRootLayout = async ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/connexion");
  }

  return <>{children}</>;
};

export default DashboardRootLayout;
