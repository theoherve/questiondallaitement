import { Sidebar } from "@/components/dashboard/sidebar";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { consultantNav } from "@/config/navigation";
import { handleLogout } from "@/app/(auth)/actions";
import { getSessionUser } from "@/lib/auth";

const ConsultantLayout = async ({ children }: { children: React.ReactNode }) => {
  const user = await getSessionUser();
  const isAdmin = user?.roles.includes("admin");

  const navItems = isAdmin
    ? [...consultantNav, { title: "Administration", href: "/admin", iconKey: "Shield" }]
    : consultantNav;

  return (
    <div className="flex min-h-screen">
      <Sidebar items={navItems} onLogout={handleLogout} />
      <div className="flex flex-1 flex-col">
        <DashboardHeader title="Espace consultante" items={navItems} />
        <main className="flex-1 bg-background-beige p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default ConsultantLayout;
