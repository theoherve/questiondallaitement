import { Sidebar } from "@/components/dashboard/sidebar";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { getAdminNavForRole } from "@/config/navigation";
import { getSessionUser } from "@/lib/auth";
import { handleLogout } from "@/app/(auth)/actions";

const AdminLayout = async ({ children }: { children: React.ReactNode }) => {
  const user = await getSessionUser();
  const navItems = getAdminNavForRole(user?.roles ?? ["admin"]);

  const isAlsoConsultant = user?.roles.includes("consultant") || user?.roles.includes("consultant_limited");
  const finalNav = isAlsoConsultant
    ? [...navItems, { title: "Espace consultante", href: "/espace-consultante", iconKey: "Stethoscope" }]
    : navItems;

  return (
    <div className="flex min-h-screen">
      <Sidebar items={finalNav} onLogout={handleLogout} />
      <div className="flex flex-1 flex-col">
        <DashboardHeader title="Administration" items={finalNav} />
        <main className="flex-1 bg-background-beige p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
