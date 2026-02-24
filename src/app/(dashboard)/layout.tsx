import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";

const DashboardRootLayout = async ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const user = await getSessionUser();
  if (!user) redirect("/connexion");
  return <>{children}</>;
};

export default DashboardRootLayout;
